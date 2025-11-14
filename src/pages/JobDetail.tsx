import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sparkles,
    ArrowLeft,
    MapPin,
    DollarSign,
    Briefcase,
    XCircle,
    Linkedin,
    CheckCircle,
    Building2,
    Globe,
    Mail,
    Phone,
    Users,
    Calendar as CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCompanyProfile } from "@/lib/Searchapi";
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
    user_id: string;
    required_skills?: string[];
    preferred_skills?: string[];
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
    source: "Applicant" | "Client";
    skills?: string[];
}

interface CompanyProfile {
    id: string;
    full_name: string;
    email: string;
    company_name?: string;
    company_logo_url?: string;
    company_description?: string;
    company_website?: string;
    company_size?: string;
    company_industry?: string;
    company_founded_year?: number;
    company_email?: string;
    company_phone?: string;
    company_city?: string;
    company_country?: string;
    company_linkedin_url?: string;
    company_twitter_url?: string;
}

const JobDetailWithCompany = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [job, setJob] = useState<Job | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [showCompanyModal, setShowCompanyModal] = useState(false);

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

            // Fetch company profile
            const profile = await getCompanyProfile(data.user_id);
            setCompanyProfile(profile);
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
            const { data: applicantData, error: applicantError } = await supabase
                .from("Applicant")
                .select("*")
                .eq("job_id", jobId)
                .order("created_at", { ascending: false });

            if (applicantError) throw applicantError;

            const allCandidates: Candidate[] = (applicantData || []).map((c) => ({
                ...c,
                source: "Applicant" as const,
            }));

            setCandidates(allCandidates);
        } catch (error: any) {
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
            const { error } = await supabase
                .from("jobs")
                .update({
                    status: "closed",
                    closed_at: new Date().toISOString(),
                })
                .eq("id", job.id);

            if (error) throw error;

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
        const variants: Record<
            string,
            { variant: "default" | "secondary" | "outline" | "destructive"; icon: any }
        > = {
            active: { variant: "default", icon: CheckCircle },
            closed: { variant: "secondary", icon: XCircle },
            draft: { variant: "outline", icon: null },
            archived: { variant: "secondary", icon: null },
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

    const getScore = (candidate: Candidate) => {
        if (candidate.Score !== undefined && candidate.Score !== null) {
            return candidate.Score;
        }
        if (candidate.ai_score !== undefined && candidate.ai_score !== null) {
            return candidate.ai_score;
        }
        return null;
    };

    const getCompanyInitials = (name?: string) => {
        if (!name) return "CO";
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
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
                    {/* Company Profile Header - NEW */}
                    {companyProfile && (
                        <Card className="hover-glow cursor-pointer" onClick={() => setShowCompanyModal(true)}>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={companyProfile.company_logo_url || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl">
                                            {getCompanyInitials(companyProfile.company_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold">
                                            {companyProfile.company_name || "Company Profile"}
                                        </h2>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {companyProfile.company_description || "Click to view full company profile"}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        View Profile
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Job Details */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {getStatusBadge(job.status)}
                                        {job.posted_to_linkedin && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Linkedin className="h-3 w-3" />
                                                Posted to LinkedIn
                                            </Badge>
                                        )}
                                    </div>
                                </div>

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
                                                        <li className="font-medium">Job data will remain in database permanently</li>
                                                    </ul>
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
                                    <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
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

                            {/* Skills Section - NEW */}
                            {(job.required_skills?.length || job.preferred_skills?.length) && (
                                <div className="border-t pt-4 space-y-3">
                                    {job.required_skills && job.required_skills.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Required Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {job.required_skills.map((skill, i) => (
                                                    <Badge key={i} variant="default">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {job.preferred_skills && job.preferred_skills.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Preferred Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {job.preferred_skills.map((skill, i) => (
                                                    <Badge key={i} variant="outline">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                                <div className="text-center py-8 text-muted-foreground">No applications yet</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Skills</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Interview Status</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Applied Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {candidates.map((candidate) => (
                                                <TableRow key={candidate.id}>
                                                    <TableCell className="font-medium">{candidate.name}</TableCell>
                                                    <TableCell>{candidate.email}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {candidate.skills?.slice(0, 2).map((skill, i) => (
                                                                <Badge key={i} variant="outline" className="text-xs">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                            {candidate.skills && candidate.skills.length > 2 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{candidate.skills.length - 2}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getCandidateStatusBadge(candidate.status)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{candidate.interview_status || "Pending"}</Badge>
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

            {/* Company Profile Modal - NEW */}
            <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={companyProfile?.company_logo_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                                    {getCompanyInitials(companyProfile?.company_name)}
                                </AvatarFallback>
                            </Avatar>
                            {companyProfile?.company_name || "Company Profile"}
                        </DialogTitle>
                        <DialogDescription>Full company information and details</DialogDescription>
                    </DialogHeader>

                    {companyProfile && (
                        <div className="space-y-6 pt-4">
                            {/* Company Description */}
                            {companyProfile.company_description && (
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        About
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{companyProfile.company_description}</p>
                                </div>
                            )}

                            {/* Company Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {companyProfile.company_industry && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Industry</p>
                                        <p className="font-medium">{companyProfile.company_industry}</p>
                                    </div>
                                )}
                                {companyProfile.company_size && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            Company Size
                                        </p>
                                        <p className="font-medium">{companyProfile.company_size}</p>
                                    </div>
                                )}
                                {companyProfile.company_founded_year && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            Founded
                                        </p>
                                        <p className="font-medium">{companyProfile.company_founded_year}</p>
                                    </div>
                                )}
                            </div>

                            {/* Location */}
                            {(companyProfile.company_city || companyProfile.company_country) && (
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Location
                                    </h4>
                                    <p className="text-sm">
                                        {[companyProfile.company_city, companyProfile.company_country].filter(Boolean).join(", ")}
                                    </p>
                                </div>
                            )}

                            {/* Contact Information */}
                            <div>
                                <h4 className="font-semibold mb-3">Contact Information</h4>
                                <div className="space-y-2">
                                    {companyProfile.company_website && (
                                        <a
                                            href={companyProfile.company_website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm hover:text-primary"
                                        >
                                            <Globe className="h-4 w-4" />
                                            {companyProfile.company_website}
                                        </a>
                                    )}
                                    {companyProfile.company_email && (
                                        <a href={`mailto:${companyProfile.company_email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                                            <Mail className="h-4 w-4" />
                                            {companyProfile.company_email}
                                        </a>
                                    )}
                                    {companyProfile.company_phone && (
                                        <a href={`tel:${companyProfile.company_phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                                            <Phone className="h-4 w-4" />
                                            {companyProfile.company_phone}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Social Links */}
                            {(companyProfile.company_linkedin_url || companyProfile.company_twitter_url) && (
                                <div>
                                    <h4 className="font-semibold mb-3">Social Media</h4>
                                    <div className="flex gap-3">
                                        {companyProfile.company_linkedin_url && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={companyProfile.company_linkedin_url} target="_blank" rel="noopener noreferrer">
                                                    <Linkedin className="h-4 w-4 mr-2" />
                                                    LinkedIn
                                                </a>
                                            </Button>
                                        )}
                                        {companyProfile.company_twitter_url && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={companyProfile.company_twitter_url} target="_blank" rel="noopener noreferrer">
                                                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                                                    </svg>
                                                    Twitter
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default JobDetailWithCompany;