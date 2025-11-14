// =====================================================
// CANDIDATE SEARCH API SERVICE
// All functions for searching and managing candidates
// =====================================================

import { supabase } from "@/integrations/supabase/client";
import { getRelatedSkills, calculateSkillMatch, fuzzyMatch } from "../lib/skillMapping";

// =====================================================
// TYPES
// =====================================================

export interface SearchResult {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    skills: string[];
    experience_years?: number;
    cv_file_url?: string;
    linkedin_profile_url?: string;
    source: string;
    created_at: string;
  };
  job: {
    id: string;
    title: string;
    required_skills: string[];
    preferred_skills: string[];
    status: string;
  };
  matchScore: number;
}

export interface JobWithApplications {
  id: string;
  title: string;
  status: string;
  required_skills: string[];
  preferred_skills: string[];
  applicationCount: number;
}

// =====================================================
// MAIN SEARCH FUNCTION
// =====================================================

/**
 * Search candidates by role/keyword (LinkedIn-style)
 * Returns all candidates who applied to matching jobs
 */
export const searchCandidatesByRole = async (
  searchQuery: string
): Promise<SearchResult[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Step 1: Expand search query to include related skills
    const relatedTerms = getRelatedSkills(searchQuery);
    console.log("Search terms:", [searchQuery, ...relatedTerms]);

    // Step 2: Find ALL matching jobs (including closed/archived)
    const { data: matchingJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id);

    if (jobsError) throw jobsError;

    // Filter jobs by search relevance
    const relevantJobs = (matchingJobs || []).filter(job => {
      const titleMatch = fuzzyMatch(job.title, searchQuery) > 50;
      const skillMatch = [searchQuery, ...relatedTerms].some(term =>
        job.required_skills?.some((skill: string) =>
          skill.toLowerCase().includes(term.toLowerCase())
        ) ||
        job.preferred_skills?.some((skill: string) =>
          skill.toLowerCase().includes(term.toLowerCase())
        )
      );
      return titleMatch || skillMatch;
    });

    if (relevantJobs.length === 0) {
      return [];
    }

    const jobIds = relevantJobs.map(j => j.id);

    // Step 3: Get ALL candidates who applied to these jobs
    const allCandidates: SearchResult[] = [];

    // Fetch from Applicant table
    const { data: applicants } = await supabase
      .from("Applicant")
      .select("*")
      .in("job_id", jobIds)
      .eq("user_id", user.id);

    // Fetch from Client table
    const { data: clients } = await supabase
      .from("Client")
      .select("*")
      .in("job_id", jobIds)
      .eq("user_id", user.id);

    // Fetch from Shortlisted candidates
    const { data: shortlisted } = await supabase
      .from("Shortlisted candidates")
      .select("*")
      .in("job_id", jobIds)
      .eq("user_id", user.id);

    // Fetch from Qualified For Final Interview
    const { data: finalInterview } = await supabase
      .from("Qualified For Final Interview")
      .select("*")
      .in("job_id", jobIds)
      .eq("user_id", user.id);

    // Step 4: Combine all candidates with match scores
    const processCandidates = (
      candidates: any[],
      source: string
    ): SearchResult[] => {
      return candidates.map(candidate => {
        const job = relevantJobs.find(j => j.id === candidate.job_id);
        if (!job) return null;

        const matchScore = calculateSkillMatch(
          candidate.skills || [],
          job.required_skills || [],
          job.preferred_skills || []
        );

        return {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            skills: candidate.skills || [],
            experience_years: candidate.experience_years,
            cv_file_url: candidate.cv_file_url,
            linkedin_profile_url: candidate.linkedin_profile_url,
            source,
            created_at: candidate.created_at,
          },
          job: {
            id: job.id,
            title: job.title,
            required_skills: job.required_skills || [],
            preferred_skills: job.preferred_skills || [],
            status: job.status,
          },
          matchScore,
        };
      }).filter(Boolean) as SearchResult[];
    };

    allCandidates.push(...processCandidates(applicants || [], "Applicant"));
    allCandidates.push(...processCandidates(clients || [], "Client"));
    allCandidates.push(...processCandidates(shortlisted || [], "Shortlisted"));
    allCandidates.push(...processCandidates(finalInterview || [], "Final Interview"));

    // Step 5: Deduplicate by email (keep highest score)
    const candidateMap = new Map<string, SearchResult>();
    allCandidates.forEach(result => {
      const existing = candidateMap.get(result.candidate.email);
      if (!existing || result.matchScore > existing.matchScore) {
        candidateMap.set(result.candidate.email, result);
      }
    });

    // Step 6: Sort by match score (highest first)
    const uniqueResults = Array.from(candidateMap.values());
    uniqueResults.sort((a, b) => b.matchScore - a.matchScore);

    return uniqueResults;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

// =====================================================
// JOB STATUS MANAGEMENT (SOFT DELETE)
// =====================================================

/**
 * Update job status (NEVER delete from database)
 */
export const updateJobStatus = async (
  jobId: string,
  status: "active" | "closed" | "archived" | "paused"
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("jobs")
      .update({
        status,
        ...(status === "closed" && { closed_at: new Date().toISOString() }),
      })
      .eq("id", jobId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating job status:", error);
    throw error;
  }
};

/**
 * Get all jobs (including archived/closed)
 */
export const getAllJobs = async (
  includeArchived: boolean = true
): Promise<JobWithApplications[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let query = supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id);

    if (!includeArchived) {
      query = query.neq("status", "archived");
    }

    const { data: jobs, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // Count applications for each job
    const jobsWithCount = await Promise.all(
      (jobs || []).map(async (job) => {
        const { count } = await supabase
          .from("Applicant")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          required_skills: job.required_skills || [],
          preferred_skills: job.preferred_skills || [],
          applicationCount: count || 0,
        };
      })
    );

    return jobsWithCount;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

/**
 * Get all applications for a specific job
 */
export const getJobApplications = async (jobId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch from Applicant table only
    const { data: applications, error } = await supabase
      .from("Applicant")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return applications || [];
  } catch (error) {
    console.error("Error fetching applications:", error);
    throw error;
  }
};

// =====================================================
// COMPANY PROFILE FUNCTIONS
// =====================================================

/**
 * Get company profile for a user
 */
export const getCompanyProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return null;
  }
};

/**
 * Update company profile
 */
export const updateCompanyProfile = async (
  userId: string,
  updates: Partial<{
    company_name: string;
    company_logo_url: string;
    company_description: string;
    company_website: string;
    company_size: string;
    company_industry: string;
    company_email: string;
    company_phone: string;
    company_city: string;
    company_country: string;
  }>
) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating company profile:", error);
    throw error;
  }
};