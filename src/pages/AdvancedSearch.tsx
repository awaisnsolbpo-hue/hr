import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Star,
  ArrowLeft,
  Download,
  ExternalLink,
  Sparkles,
  X,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  MoveRight,
  PenSquare,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  experience_years?: number;
  ai_score?: number;
  cv_file_url?: string;
  job_id: string;
  job_title?: string;
  user_id: string;
  status?: string;
  interview_status?: string;
  interview_date?: string;
  interview_result?: string;
  created_at: string;
  source: string;
  linkedin_profile_url?: string;
  Analysis?: string;
}

interface Job {
  id: string;
  title: string;
}

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateData[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cvViewerCandidate, setCvViewerCandidate] = useState<CandidateData | null>(null);
  const [editCandidate, setEditCandidate] = useState<CandidateData | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    interview_status: "",
    ai_score: "",
    notes: "",
  });

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("");
  const [minExperience, setMinExperience] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    searchQuery,
    selectedJob,
    selectedSource,
    selectedStatus,
    minScore,
    minExperience,
    selectedSkill,
    candidates,
  ]);

  useEffect(() => {
    if (editCandidate) {
      setEditForm({
        name: editCandidate.name || "",
        email: editCandidate.email || "",
        phone: editCandidate.phone || "",
        interview_status: editCandidate.interview_status || "",
        ai_score: editCandidate.ai_score?.toString() || "",
        notes: editCandidate.Analysis || "",
      });
    }
  }, [editCandidate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Load all candidates from all sources
      const [applicantsRes, clientsRes, shortlistedRes, finalRes] = await Promise.all([
        supabase
          .from("Applicant")
          .select("*, jobs(title)")
          .eq("user_id", user.id),
        supabase
          .from("Client")
          .select("*, jobs(title)")
          .eq("user_id", user.id),
        supabase
          .from("Shortlisted_candidates")
          .select("*, jobs(title)")
          .eq("user_id", user.id),
        supabase
          .from("Qualified_For_Final_Interview")
          .select("*, jobs(title)")
          .eq("user_id", user.id),
      ]);

      // Combine all candidates
      const allCandidates: CandidateData[] = [
        ...(applicantsRes.data || []).map((c: any) => ({
          ...c,
          source: "Applicant",
          job_title: c.jobs?.title,
        })),
        ...(clientsRes.data || []).map((c: any) => ({
          ...c,
          source: "Client",
          job_title: c.jobs?.title,
        })),
        ...(shortlistedRes.data || []).map((c: any) => ({
          ...c,
          source: "Shortlisted",
          job_title: c.jobs?.title,
        })),
        ...(finalRes.data || []).map((c: any) => ({
          ...c,
          source: "Final Interview",
          job_title: c.jobs?.title,
        })),
      ];

      setCandidates(allCandidates);
      setFilteredCandidates(allCandidates);

      // Extract unique skills
      const skillsSet = new Set<string>();
      allCandidates.forEach((c) => {
        if (c.skills && Array.isArray(c.skills)) {
          c.skills.forEach((skill) => skillsSet.add(skill));
        }
      });
      setAllSkills(Array.from(skillsSet).sort());

      // Load jobs
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setJobs(jobsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...candidates];

    // Search by name, email, or phone
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query)
      );
    }

    // Filter by job
    if (selectedJob !== "all") {
      filtered = filtered.filter((c) => c.job_id === selectedJob);
    }

    // Filter by source
    if (selectedSource !== "all") {
      filtered = filtered.filter((c) => c.source === selectedSource);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((c) => c.status === selectedStatus);
    }

    // Filter by minimum score
    if (minScore) {
      const scoreThreshold = parseFloat(minScore);
      filtered = filtered.filter((c) => (c.ai_score || 0) >= scoreThreshold);
    }

    // Filter by minimum experience
    if (minExperience) {
      const expThreshold = parseInt(minExperience);
      filtered = filtered.filter((c) => (c.experience_years || 0) >= expThreshold);
    }

    // Filter by skill
    if (selectedSkill !== "all") {
      filtered = filtered.filter(
        (c) => c.skills && c.skills.includes(selectedSkill)
      );
    }

    setFilteredCandidates(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedJob("all");
    setSelectedSource("all");
    setSelectedStatus("all");
    setMinScore("");
    setMinExperience("");
    setSelectedSkill("all");
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "Applicant":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Client":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Shortlisted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Final Interview":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getScore = (candidate: CandidateData) => {
    if (candidate.ai_score != null) return candidate.ai_score;
    return null;
  };

  const getTableNameForCandidate = (candidate: CandidateData) => {
    switch (candidate.source) {
      case "Applicant":
        return "Applicant";
      case "Client":
        return "Client";
      case "Shortlisted":
        return "Shortlisted_candidates";
      case "Final Interview":
        return "Qualified_For_Final_Interview";
      default:
        return "Applicant";
    }
  };

  const handleDownloadCV = (cvUrl: string) => {
    const link = document.createElement("a");
    link.href = cvUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMoveCandidate = async (candidate: CandidateData, destination: "qualified" | "shortlisted") => {
    try {
      setActionLoadingId(candidate.id);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        navigate("/login");
        return;
      }

      const payload = {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || null,
        ai_score: getScore(candidate),
        cv_file_url: candidate.cv_file_url || null,
        job_id: candidate.job_id || null,
        user_id: auth.user.id,
        interview_status: candidate.interview_status || null,
        interview_date: candidate.interview_date || null,
        interview_result: candidate.interview_result || null,
        status: candidate.source,
        notes: candidate.Analysis || null,
        updated_at: new Date().toISOString(),
      };

      const tableName = destination === "qualified" ? "Qualified_For_Final_Interview" : "Shortlisted_candidates";
      const { error } = await supabase.from(tableName as any).upsert(payload);

      if (error) throw error;

      const newSource = destination === "qualified" ? "Final Interview" : "Shortlisted";
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? {
                ...c,
                source: newSource,
              }
            : c
        )
      );
      setFilteredCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? {
                ...c,
                source: newSource,
              }
            : c
        )
      );

      toast({
        title: "Candidate updated",
        description: `Moved to ${destination === "qualified" ? "Initial Interview Qualified" : "Shortlisted"} stage.`,
      });
    } catch (error: any) {
      console.error("Move candidate error:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to move candidate",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditSubmit = async () => {
    if (!editCandidate) return;

    try {
      setEditLoading(true);
      const updates: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        interview_status: editForm.interview_status.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editForm.ai_score) {
        const parsed = Number(editForm.ai_score);
        updates.ai_score = Number.isNaN(parsed) ? null : parsed;
      } else {
        updates.ai_score = null;
      }

      if (editForm.notes) {
        updates.notes = editForm.notes;
      }

      const tableName = getTableNameForCandidate(editCandidate);
      const { error } = await supabase.from(tableName as any).update(updates).eq("id", editCandidate.id);
      if (error) throw error;

      const updater = (candidateList: CandidateData[]) =>
        candidateList.map((candidate) =>
          candidate.id === editCandidate.id
            ? {
                ...candidate,
                ...updates,
                ai_score: updates.ai_score ?? candidate.ai_score,
                interview_status: updates.interview_status,
                Analysis: updates.notes ?? candidate.Analysis,
              }
            : candidate
        );

      setCandidates(updater);
      setFilteredCandidates(updater);

      toast({
        title: "Candidate updated",
        description: "Details saved successfully.",
      });

      setEditCandidate(null);
    } catch (error: any) {
      console.error("Edit candidate error:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to update candidate",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCandidateConfirm = async () => {
    if (!deleteCandidate) return;

    try {
      setActionLoadingId(deleteCandidate.id);
      const tableName = getTableNameForCandidate(deleteCandidate);
      const { error } = await supabase.from(tableName as any).delete().eq("id", deleteCandidate.id);
      if (error) throw error;

      setCandidates((prev) => prev.filter((candidate) => candidate.id !== deleteCandidate.id));
      setFilteredCandidates((prev) => prev.filter((candidate) => candidate.id !== deleteCandidate.id));

      toast({
        title: "Candidate removed",
        description: `${deleteCandidate.name} has been deleted`,
      });
      setDeleteCandidate(null);
    } catch (error: any) {
      console.error("Delete candidate error:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to delete candidate",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeFiltersCount = [
    selectedJob !== "all",
    selectedSource !== "all",
    selectedStatus !== "all",
    minScore !== "",
    minExperience !== "",
    selectedSkill !== "all",
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">AI Hiring</span>
            </div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Advanced Candidate Search</h1>
              <p className="text-muted-foreground">
                Search and filter through all your candidates
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search Bar */}
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="shadow-elegant animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Advanced Filters
                  </CardTitle>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Job Filter */}
                  <div className="space-y-2">
                    <Label>Job Position</Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Jobs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source Filter */}
                  <div className="space-y-2">
                    <Label>Candidate Source</Label>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="Applicant">Applicants</SelectItem>
                        <SelectItem value="Client">Clients</SelectItem>
                        <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="Final Interview">Final Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skill Filter */}
                  <div className="space-y-2">
                    <Label>Required Skill</Label>
                    <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Skills" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Skills</SelectItem>
                        {allSkills.map((skill) => (
                          <SelectItem key={skill} value={skill}>
                            {skill}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minimum Score */}
                  <div className="space-y-2">
                    <Label>Minimum AI Score</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 70"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Minimum Experience */}
                  <div className="space-y-2">
                    <Label>Minimum Experience (years)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 3"
                      value={minExperience}
                      onChange={(e) => setMinExperience(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredCandidates.length}</span> of{" "}
              <span className="font-semibold text-foreground">{candidates.length}</span> candidates
            </p>
          </div>

          {/* Results Grid */}
          {filteredCandidates.length === 0 ? (
            <Card className="shadow-elegant">
              <CardContent className="py-12 text-center">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No candidates found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search filters
                </p>
                {activeFiltersCount > 0 && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className="hover-glow cursor-pointer transition-all duration-200 hover:shadow-lg"
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setShowDetails(true);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{candidate.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {candidate.email}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>Manage Candidate</DropdownMenuLabel>
                            {candidate.cv_file_url ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCvViewerCandidate(candidate);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View CV
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Eye className="mr-2 h-4 w-4" />
                                No CV Uploaded
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCandidate(candidate, "qualified");
                              }}
                              disabled={actionLoadingId === candidate.id}
                            >
                              <MoveRight className="mr-2 h-4 w-4" />
                              Move to Initial Interview Qualified
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveCandidate(candidate, "shortlisted");
                              }}
                              disabled={actionLoadingId === candidate.id}
                            >
                              <MoveRight className="mr-2 h-4 w-4 rotate-180" />
                              Move to Shortlisted
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditCandidate(candidate);
                              }}
                            >
                              <PenSquare className="mr-2 h-4 w-4" />
                              Edit Candidate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteCandidate(candidate);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Candidate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Source & Score */}
                      <div className="flex items-center gap-2">
                        <Badge className={getSourceBadgeColor(candidate.source)}>
                          {candidate.source}
                        </Badge>
                        {candidate.ai_score && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {candidate.ai_score}%
                          </Badge>
                        )}
                      </div>

                      {/* Job Title */}
                      {candidate.job_title && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          <span className="truncate">{candidate.job_title}</span>
                        </div>
                      )}

                      {/* Skills */}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{candidate.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Experience */}
                      {candidate.experience_years && (
                        <div className="text-sm text-muted-foreground">
                          {candidate.experience_years} years experience
                        </div>
                      )}

                      {/* Applied Date */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Applied {new Date(candidate.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Candidate Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {getInitials(selectedCandidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedCandidate.name}
                </DialogTitle>
                <DialogDescription>
                  Complete candidate profile and application details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Source & Score */}
                <div className="flex items-center gap-2">
                  <Badge className={getSourceBadgeColor(selectedCandidate.source)}>
                    {selectedCandidate.source}
                  </Badge>
                  {selectedCandidate.ai_score && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      AI Score: {selectedCandidate.ai_score}%
                    </Badge>
                  )}
                  {selectedCandidate.status && (
                    <Badge variant="secondary">{selectedCandidate.status}</Badge>
                  )}
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedCandidate.email}`}
                        className="hover:text-primary"
                      >
                        {selectedCandidate.email}
                      </a>
                    </div>
                    {selectedCandidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${selectedCandidate.phone}`}
                          className="hover:text-primary"
                        >
                          {selectedCandidate.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Applied For */}
                {selectedCandidate.job_title && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Applied Position
                    </h4>
                    <p className="text-sm">{selectedCandidate.job_title}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {selectedCandidate.experience_years !== undefined && (
                  <div>
                    <h4 className="font-semibold mb-3">Experience</h4>
                    <p className="text-sm">
                      {selectedCandidate.experience_years} years of professional experience
                    </p>
                  </div>
                )}

                {/* LinkedIn */}
                {selectedCandidate.linkedin_profile_url && (
                  <div>
                    <h4 className="font-semibold mb-3">LinkedIn Profile</h4>
                    <a
                      href={selectedCandidate.linkedin_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      View LinkedIn Profile
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Application Date */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Application Timeline
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Applied on {new Date(selectedCandidate.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* CV Actions */}
                <div className="pt-4 border-t">
                  {selectedCandidate.cv_file_url ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setCvViewerCandidate(selectedCandidate)}
                    >
                      <Eye className="h-4 w-4" />
                      View CV
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No CV uploaded for this candidate.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cvViewerCandidate} onOpenChange={(open) => !open && setCvViewerCandidate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Candidate CV</DialogTitle>
            <DialogDescription>
              {cvViewerCandidate?.name} &middot; {cvViewerCandidate?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cvViewerCandidate?.cv_file_url ? (
              <div className="h-[500px] rounded-md border">
                <iframe
                  src={cvViewerCandidate.cv_file_url}
                  title="Candidate CV"
                  className="w-full h-full rounded-md"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No CV uploaded for this candidate.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCvViewerCandidate(null)}>
              Close
            </Button>
            {cvViewerCandidate?.cv_file_url && (
              <Button onClick={() => handleDownloadCV(cvViewerCandidate.cv_file_url!)}>
                <Download className="mr-2 h-4 w-4" />
                Download CV
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCandidate} onOpenChange={(open) => !open && setEditCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>Update the candidate information and save changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Interview Status</Label>
              <Input
                id="edit-status"
                value={editForm.interview_status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, interview_status: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-score">AI Score</Label>
              <Input
                id="edit-score"
                value={editForm.ai_score}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ai_score: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                rows={4}
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCandidate(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove{" "}
              <span className="font-semibold">{deleteCandidate?.name}</span> from your candidates list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidateConfirm}
              disabled={actionLoadingId === deleteCandidate?.id}
            >
              {actionLoadingId === deleteCandidate?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdvancedSearch;