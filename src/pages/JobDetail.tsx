import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    ArrowLeft,
    MapPin,
    DollarSign,
    Briefcase,
    XCircle,
    Linkedin,
    CheckCircle
} from "lucide-react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Job {
    id: string;
    title: string;
    description?: string;
    city?: string;
    country?: string;
    salary_range?: string;
    location_type?: string;
    job_level?: string;
    status: string;
    created_at: string;
    closed_at?: string;
    linkedin_post_id?: string;
    posted_to_linkedin?: boolean;
}

interface Candidate {
    id: string;
    name: string;
    email: string;
    status: string;
    interview_status: string;
    ai_score?: number;
    Score?: number;
    created_at: string;
    source: 'Applicant' | 'Client';
}

const JobDetail = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [job, setJob] = useState<Job | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (jobId) {
            fetchJobDetails();
            fetchCandidates();
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            const { data, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", jobId)
                .single();

            if (error) throw error;
            setJob(data);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchCandidates = async () => {
        try {
            // Fetch ONLY from Applicant table (public link applications)
            const { data: applicantData, error: applicantError } = await supabase
                .from("Applicant")
                .select("*")
                .eq("job_id", jobId)
                .order("created_at", { ascending: false });

            if (applicantError) {
                console.error("Applicant fetch error:", applicantError);
                throw applicantError;
            }

            // Map with source label
            const allCandidates: Candidate[] = (applicantData || []).map(c => ({ 
                ...c, 
                source: 'Applicant' as const 
            }));

            setCandidates(allCandidates);
        } catch (error: any) {
            console.error("Fetch candidates error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to fetch candidates",
                variant: "destructive",
            });
        }
    };

    const handleCloseJob = async () => {
        if (!job) return;

        setClosing(true);

        try {
            // Update job status in database
            const { error } = await supabase
                .from("jobs")
                .update({
                    status: "closed",
                    closed_at: new Date().toISOString(),
                })
                .eq("id", job.id);

            if (error) throw error;

            // Update local state
            setJob({
                ...job,
                status: "closed",
                closed_at: new Date().toISOString(),
            });

            toast({
                title: "Job Closed Successfully",
                description: "This job is now closed and will no longer accept applications.",
            });
        } catch (error: any) {
            toast({
                title: "Error Closing Job",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setClosing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", icon: any }> = {
            active: { variant: "default", icon: CheckCircle },
            closed: { variant: "secondary", icon: XCircle },
            draft: { variant: "outline", icon: null },
        };
        const config = variants[status] || variants.draft;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                {Icon && <Icon className="h-3 w-3" />}
                {status}
            </Badge>
        );
    };

    const getCandidateStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
            pending: "outline",
            Pending: "outline",
            reviewed: "secondary",
            accepted: "default",
            rejected: "destructive",
        };
        return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
    };

    const getSourceBadge = (source: 'Applicant' | 'Client') => {
        return source === 'Applicant' 
            ? <Badge variant="outline">Applicant</Badge>
            : <Badge variant="secondary">Client</Badge>;
    };

    const getScore = (candidate: Candidate) => {
        // Check for Score field (from Applicant table)
        if (candidate.Score !== undefined && candidate.Score !== null) {
            return candidate.Score;
        }
        // Check for ai_score field
        if (candidate.ai_score !== undefined && candidate.ai_score !== null) {
            return candidate.ai_score;
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
                <div className="text-center">
                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Job not found</p>
                    <Button onClick={() => navigate("/jobs")} className="mt-4">
                        Back to Jobs
                    </Button>
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
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold text-gradient">AI Hiring</span>
                        </Link>

                        <Button variant="ghost" size="default" onClick={() => navigate("/jobs")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Jobs
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-6">
                    {/* Job Details */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        {getStatusBadge(job.status)}
                                        {job.posted_to_linkedin && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Linkedin className="h-3 w-3" />
                                                Posted to LinkedIn
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Close Job Button */}
                                {job.status === "active" && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="lg" disabled={closing}>
                                                <XCircle className="h-4 w-4 mr-2" />
                                                {closing ? "Closing..." : "Close Job"}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Close This Job?</AlertDialogTitle>
                                                <AlertDialogDescription className="space-y-2">
                                                    <p>This action will:</p>
                                                    <ul className="list-disc list-inside space-y-1 mt-2">
                                                        <li>Mark this job as closed</li>
                                                        <li>Stop accepting new applications</li>
                                                        {job.posted_to_linkedin && job.linkedin_post_id && (
                                                            <li className="text-red-600 font-medium">
                                                                Remove the LinkedIn post
                                                            </li>
                                                        )}
                                                    </ul>
                                                    <p className="mt-4 font-medium">
                                                        Existing applications will remain accessible.
                                                    </p>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleCloseJob}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Yes, Close Job
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {job.description && (
                                <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <p className="text-muted-foreground">{job.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {job.city && job.country && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {job.city}, {job.country}
                                        </span>
                                    </div>
                                )}

                                {job.salary_range && (
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span>{job.salary_range}</span>
                                    </div>
                                )}

                                {job.job_level && (
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                        <span>{job.job_level}</span>
                                    </div>
                                )}

                                {job.location_type && (
                                    <div>
                                        <Badge variant="secondary">{job.location_type}</Badge>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Posted on {new Date(job.created_at).toLocaleDateString()}
                                </p>
                                {job.closed_at && (
                                    <p className="text-sm text-red-600 font-medium">
                                        Closed on {new Date(job.closed_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Applications */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Applications ({candidates.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {candidates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No applications yet
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Interview Status</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Applied Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {candidates.map((candidate) => (
                                                <TableRow key={`${candidate.source}-${candidate.id}`}>
                                                    <TableCell className="font-medium">{candidate.name}</TableCell>
                                                    <TableCell>{candidate.email}</TableCell>
                                                    <TableCell>{getSourceBadge(candidate.source)}</TableCell>
                                                    <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {candidate.interview_status || 'Pending'}
                                                        </Badge>
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
        </div>
    );
};

export default JobDetail;