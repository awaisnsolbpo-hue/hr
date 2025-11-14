export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  company_logo_url: string | null;
  is_company_profile_complete: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  job_title?: string | null;
}

export interface Metric {
  activeJobs: number;
  linkedInJobs: number;
  totalCandidates: number;
  initialInterviewQualified: number;
  scheduledInterviews: number;
  shortlistedCandidates: number;
  successRate: number;
}

export interface UpcomingMeeting {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string | null;
  meeting_date: string;
  meeting_duration: number;
  meeting_link: string;
  ai_score: number | null;
}

export interface RecentActivity {
  id: string;
  type: 'candidate_added' | 'interview_completed' | 'candidate_shortlisted' | 'job_posted';
  message: string;
  timestamp: string;
  candidateName?: string;
  jobTitle?: string;
}
