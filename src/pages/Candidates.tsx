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
    stage_priority: number;
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
    const [filterSource] = useState<string>("all");
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

    const fetchCandidates = async () => {
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) {
                navigate("/login");
                return;
            }

            setLoading(true);

            // Fetch candidates along with related job data
            const { data, error } = await supabase
                .from("Applicant")
                .select(`
                    *,
                    jobs:job_id (
                        title
                    )
                `)
                .eq("user_id", auth.user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const loaded = (data || []).map(c => ({
                ...c,
                source: "Applicant" as const,
                stage_priority: 2
            }));

            setCandidates(loaded);
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
        if (candidate.Score != null) return candidate.Score;
        if (candidate.ai_score != null) return candidate.ai_score;
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

                        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
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
                                Total: {filteredCandidates.length} candidates
                            </p>
                        </div>
                        {tableFilter && (
                            <Button variant="outline" onClick={() => navigate('/candidates')}>
                                View All Candidates
                            </Button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                                                <TableHead>Job</TableHead>
                                                <TableHead>Stage</TableHead>
                                                <TableHead>Interview</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Applied</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {filteredCandidates.map((candidate) => (
                                                <TableRow key={candidate.id}>
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

                                                    <TableCell>{getSourceBadge(candidate.source)}</TableCell>

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
                                                        {getScore(candidate) !== null ? (
                                                            <Badge variant="secondary">{getScore(candidate)}%</Badge>
                                                        ) : (
                                                            "N/A"
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {new Date(candidate.created_at).toLocaleDateString()}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {candidate.source !== 'Shortlisted' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScheduleMeeting(candidate)}
                                                                >
                                                                    <Calendar className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {candidate.cv_file_url && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => window.open(candidate.cv_file_url, "_blank")}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {candidate['Recording URL'] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => window.open(candidate['Recording URL'], "_blank")}
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
