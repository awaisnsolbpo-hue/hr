import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowLeft, Search, Download, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import ScheduleMeetingDialog from "@/components/ScheduleMeetingDialog";

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone?: string;
    interview_status?: string;
    interview_date?: string;
    interview_result?: string;
    ai_score?: number;
    Score?: number;
    cv_file_url?: string;
    created_at: string;
    updated_at?: string;
    job_id?: string;
    user_id?: string;
    source: 'Applicant' | 'Shortlisted' | 'Final Interview' | 'Client';
    stage_priority: number; // For determining highest stage
    Transcript?: string;
    'Recording URL'?: string;
    'Screen recording'?: string;
    Analysis?: string;
    'Question Ask by Client'?: string;
    'AI Generated Question'?: string;
    linkedin_profile_url?: string;
    applied_via_linkedin?: boolean;
    source_linkedin?: boolean;
    jobs?: {
        title: string;
    };
}

const Candidates = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState<string>("all");
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

    const tableFilter = searchParams.get('table');

    useEffect(() => {
        fetchCandidates();
    }, [tableFilter]);

    useEffect(() => {
        let filtered = candidates;

        if (filterSource !== "all") {
            filtered = filtered.filter((c) => c.source === filterSource);
        }

        if (searchQuery) {
            filtered = filtered.filter(
                (c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.jobs?.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredCandidates(filtered);
    }, [searchQuery, candidates, filterSource]);

    // STAGE PRIORITY: Higher number = more advanced stage
    const getStagePriority = (source: Candidate['source']): number => {
        const priorities = {
            'Client': 1,           // Manual import (earliest stage)
            'Applicant': 2,        // Applied via public link
            'Final Interview': 3,  // Qualified for final interview
            'Shortlisted': 4       // Shortlisted (most advanced)
        };
        return priorities[source];
    };

    const deduplicateCandidates = (allCandidates: Candidate[]): Candidate[] => {
        const candidateMap = new Map<string, Candidate>();

        allCandidates.forEach(candidate => {
            const email = candidate.email.toLowerCase();
            const existing = candidateMap.get(email);

            // Keep the candidate with highest stage priority
            if (!existing || candidate.stage_priority > existing.stage_priority) {
                candidateMap.set(email, candidate);
            }
        });

        return Array.from(candidateMap.values());
    };

    const fetchCandidates = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }

            let allCandidates: Candidate[] = [];
            let jobsMap: Record<string, string> = {};

            if (tableFilter === 'qualified') {
                const { data: finalInterviewData, error: finalInterviewError } = await supabase
                    .from("Qualified_For_Final_Interview")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (finalInterviewError) throw finalInterviewError;

                const jobIds = (finalInterviewData || []).map(c => c.job_id).filter(Boolean);
                const uniqueJobIds = [...new Set(jobIds)];

                if (uniqueJobIds.length > 0) {
                    const { data: jobsData } = await supabase
                        .from("jobs")
                        .select("id, title")
                        .in("id", uniqueJobIds);

                    if (jobsData) {
                        jobsMap = Object.fromEntries(
                            jobsData.map(job => [job.id, job.title])
                        );
                    }
                }

                allCandidates = (finalInterviewData || []).map(c => ({
                    ...c,
                    source: 'Final Interview' as const,
                    stage_priority: getStagePriority('Final Interview'),
                    jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                }));

            } else if (tableFilter === 'shortlisted') {
                const { data: shortlistedData, error: shortlistedError } = await supabase
                    .from("Shortlisted_candidates")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (shortlistedError) throw shortlistedError;

                const jobIds = (shortlistedData || []).map(c => c.job_id).filter(Boolean);
                const uniqueJobIds = [...new Set(jobIds)];

                if (uniqueJobIds.length > 0) {
                    const { data: jobsData } = await supabase
                        .from("jobs")
                        .select("id, title")
                        .in("id", uniqueJobIds);

                    if (jobsData) {
                        jobsMap = Object.fromEntries(
                            jobsData.map(job => [job.id, job.title])
                        );
                    }
                }

                allCandidates = (shortlistedData || []).map(c => ({
                    ...c,
                    source: 'Shortlisted' as const,
                    stage_priority: getStagePriority('Shortlisted'),
                    jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                }));

            } else {
                // Fetch from ALL tables
                const { data: applicantData } = await supabase
                    .from("Applicant")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                const { data: shortlistedData } = await supabase
                    .from("Shortlisted_candidates")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                const { data: finalInterviewData } = await supabase
                    .from("Qualified_For_Final_Interview")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                const { data: clientData } = await supabase
                    .from("Client")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                // Fetch job titles
                const allJobIds = [
                    ...(applicantData || []).map(c => c.job_id),
                    ...(shortlistedData || []).map(c => c.job_id),
                    ...(finalInterviewData || []).map(c => c.job_id),
                    ...(clientData || []).map(c => c.job_id)
                ].filter(Boolean);

                const uniqueJobIds = [...new Set(allJobIds)];

                if (uniqueJobIds.length > 0) {
                    const { data: jobsData } = await supabase
                        .from("jobs")
                        .select("id, title")
                        .in("id", uniqueJobIds);

                    if (jobsData) {
                        jobsMap = Object.fromEntries(
                            jobsData.map(job => [job.id, job.title])
                        );
                    }
                }

                // Merge all datasets with source labels and stage priority
                allCandidates = [
                    ...(applicantData || []).map(c => ({
                        ...c,
                        source: 'Applicant' as const,
                        stage_priority: getStagePriority('Applicant'),
                        jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                    })),
                    ...(shortlistedData || []).map(c => ({
                        ...c,
                        source: 'Shortlisted' as const,
                        stage_priority: getStagePriority('Shortlisted'),
                        jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                    })),
                    ...(finalInterviewData || []).map(c => ({
                        ...c,
                        source: 'Final Interview' as const,
                        stage_priority: getStagePriority('Final Interview'),
                        jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                    })),
                    ...(clientData || []).map(c => ({
                        ...c,
                        source: 'Client' as const,
                        stage_priority: getStagePriority('Client'),
                        jobs: c.job_id ? { title: jobsMap[c.job_id] || 'N/A' } : undefined
                    }))
                ];

                // ✨ DEDUPLICATE BY EMAIL - Keep highest stage only
                allCandidates = deduplicateCandidates(allCandidates);
            }

            // Sort by created_at
            allCandidates.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setCandidates(allCandidates);
            setFilteredCandidates(allCandidates);
        } catch (error: any) {
            console.error("Fetch error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to fetch candidates",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleMeeting = (candidate: Candidate) => {
        setSelectedCandidate(candidate);
        setScheduleDialogOpen(true);
    };

    const getInterviewStatusBadge = (status?: string) => {
        if (!status) return <Badge variant="outline">Pending</Badge>;

        const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
            pending: "outline",
            scheduled: "secondary",
            completed: "default",
            passed: "default",
            failed: "destructive",
        };
        return <Badge variant={variants[status.toLowerCase()] || "outline"}>{status}</Badge>;
    };

    const getSourceBadge = (source: Candidate['source']) => {
        const sourceConfig = {
            'Applicant': { variant: 'outline' as const, label: 'Applicant', color: 'bg-blue-100 text-blue-800' },
            'Shortlisted': { variant: 'default' as const, label: 'Shortlisted', color: 'bg-purple-100 text-purple-800' },
            'Final Interview': { variant: 'secondary' as const, label: 'Final Interview', color: 'bg-green-100 text-green-800' },
            'Client': { variant: 'outline' as const, label: 'Imported', color: 'bg-gray-100 text-gray-800' }
        };

        const config = sourceConfig[source];
        return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
    };

    const getScore = (candidate: Candidate) => {
        if (candidate.Score !== undefined && candidate.Score !== null) {
            return candidate.Score;
        }
        if (candidate.ai_score !== undefined && candidate.ai_score !== null) {
            return candidate.ai_score;
        }
        return null;
    };

    const getPageTitle = () => {
        if (tableFilter === 'qualified') return 'Qualified for Final Interview';
        if (tableFilter === 'shortlisted') return 'Shortlisted Candidates';
        return 'All Candidates';
    };

    return (
        <div className="min-h-screen bg-[var(--gradient-subtle)]">
            <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold text-gradient">AI Hiring</span>
                        </Link>

                        <Button variant="ghost" size="default" onClick={() => navigate("/dashboard")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{getPageTitle()}</h1>
                            <p className="text-muted-foreground">
                                Total: {filteredCandidates.length} {tableFilter ? '' : 'unique '}candidates
                            </p>
                        </div>
                        {tableFilter && (
                            <Button
                                variant="outline"
                                onClick={() => navigate('/candidates')}
                            >
                                View All Candidates
                            </Button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or job title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Candidate List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">Loading candidates...</p>
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No candidates found
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Job Applied</TableHead>
                                                {!tableFilter && <TableHead>Current Stage</TableHead>}
                                                <TableHead>Interview Status</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Applied Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCandidates.map((candidate) => (
                                                <TableRow key={`${candidate.source}-${candidate.id}`}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            {candidate.name}
                                                            {candidate.linkedin_profile_url && (
                                                                <a
                                                                    href={candidate.linkedin_profile_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-600 hover:underline"
                                                                >
                                                                    LinkedIn
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{candidate.email}</TableCell>
                                                    <TableCell>{candidate.phone || "N/A"}</TableCell>
                                                    <TableCell>{candidate.jobs?.title || "N/A"}</TableCell>
                                                    {!tableFilter && <TableCell>{getSourceBadge(candidate.source)}</TableCell>}
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            {getInterviewStatusBadge(candidate.interview_status)}
                                                            {candidate.interview_date && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(candidate.interview_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const score = getScore(candidate);
                                                            return score !== null ? (
                                                                <Badge variant="secondary">{score}%</Badge>
                                                            ) : (
                                                                "N/A"
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(candidate.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {candidate.source === 'Shortlisted' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScheduleMeeting(candidate)}
                                                                    title="Schedule Meeting"
                                                                >
                                                                    <Calendar className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {candidate.cv_file_url && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => window.open(candidate.cv_file_url, "_blank")}
                                                                    title="Download CV"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {candidate['Recording URL'] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => window.open(candidate['Recording URL'], "_blank")}
                                                                    title="View Recording"
                                                                >
                                                                    📹
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {selectedCandidate && (
                <ScheduleMeetingDialog
                    candidate={selectedCandidate}
                    open={scheduleDialogOpen}
                    onOpenChange={setScheduleDialogOpen}
                    onSuccess={fetchCandidates}
                />
            )}
        </div>
    );
};

export default Candidates;