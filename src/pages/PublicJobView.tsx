import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    MapPin,
    DollarSign,
    Briefcase,
    Calendar,
    Building2,
    ArrowRight,
    CheckCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    user_id: string;
}

const PublicJobView = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadLink, setUploadLink] = useState<string | null>(null);
    const [hasApplied, setHasApplied] = useState(false);
    const [checkingApplication, setCheckingApplication] = useState(true);

    useEffect(() => {
        if (jobId) {
            fetchJobDetails();
            checkExistingApplication();
        }
    }, [jobId]);

    const checkExistingApplication = async () => {
        try {
            // Check if user has already applied using email stored in localStorage
            const appliedEmail = localStorage.getItem(`applied_${jobId}`);
            
            if (appliedEmail) {
                // Verify the application exists in the database
                const { data, error } = await supabase
                    .from("Client")
                    .select("id")
                    .eq("job_id", jobId)
                    .eq("email", appliedEmail)
                    .maybeSingle();

                if (!error && data) {
                    setHasApplied(true);
                }
            }
        } catch (error) {
            console.error("Error checking existing application:", error);
        } finally {
            setCheckingApplication(false);
        }
    };

    const fetchJobDetails = async () => {
        try {
            // Fetch job details
            const { data: jobData, error: jobError } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", jobId)
                .single();

            if (jobError) throw jobError;

            // Check if job is active or closed
            if (jobData.status !== "active") {
                toast({
                    title: "Job Not Available",
                    description: "This job posting is no longer accepting applications.",
                    variant: "destructive",
                });
                setJob(null);
                setLoading(false);
                return;
            }

            // Check if job has a close_date and if it has passed
            if (jobData.close_date) {
                const closeDate = new Date(jobData.close_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time to start of day
                
                if (closeDate < today) {
                    toast({
                        title: "Job Closed",
                        description: "The application deadline for this position has passed.",
                        variant: "destructive",
                    });
                    setJob(null);
                    setLoading(false);
                    return;
                }
            }

            // Check if job has closed_at timestamp
            if (jobData.closed_at) {
                toast({
                    title: "Job Closed",
                    description: "This job has been closed and is no longer accepting applications.",
                    variant: "destructive",
                });
                setJob(null);
                setLoading(false);
                return;
            }

            setJob(jobData);

            // Check if there's an existing upload link for this job
            const { data: linkData, error: linkError } = await supabase
                .from("upload_links")
                .select("link_code")
                .eq("job_id", jobId)
                .eq("is_active", true)
                .maybeSingle();

            if (linkError && linkError.code !== 'PGRST116') {
                console.error("Error fetching upload link:", linkError);
            }

            if (linkData) {
                setUploadLink(linkData.link_code);
            } else {
                // Create a new upload link for this job
                await createUploadLink(jobData.user_id, jobId);
            }
        } catch (error: any) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load job details",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const createUploadLink = async (userId: string, jobId: string) => {
        try {
            // Generate a unique link code
            const linkCode = `job-${jobId.slice(0, 8)}-${Date.now().toString(36)}`;

            const { data, error } = await supabase
                .from("upload_links")
                .insert({
                    user_id: userId,
                    job_id: jobId,
                    link_code: linkCode,
                    is_active: true,
                    upload_count: 0,
                })
                .select("link_code")
                .single();

            if (error) throw error;

            setUploadLink(data.link_code);
        } catch (error: any) {
            console.error("Error creating upload link:", error);
        }
    };

    const handleApplyClick = async () => {
        if (hasApplied) {
            toast({
                title: "Already Applied",
                description: "You have already submitted an application for this position.",
                variant: "destructive",
            });
            return;
        }

        if (!uploadLink) {
            toast({
                title: "Error",
                description: "Unable to process application. Please try again.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Store job details in sessionStorage to use in upload form
            sessionStorage.setItem('applying_job_id', jobId || '');
            sessionStorage.setItem('applying_job_user_id', job?.user_id || '');
            sessionStorage.setItem('applying_job_title', job?.title || '');

            // Navigate to upload page
            navigate(`/upload/${uploadLink}`);
        } catch (error: any) {
            console.error("Error processing application:", error);
            toast({
                title: "Error",
                description: "Failed to process application. Please try again.",
                variant: "destructive",
            });
        }
    };

    if (loading || checkingApplication) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <div className="text-center">
                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading job details...</p>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Job Not Available</h2>
                        <p className="text-muted-foreground">
                            This job posting is no longer accepting applications.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <header className="bg-background/95 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold text-gradient">AI Hiring</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Job Header */}
                    <Card className="shadow-elegant animate-fade-in">
                        <CardHeader>
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />
                                                Now Hiring
                                            </Badge>
                                            {hasApplied && (
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Already Applied
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                    {job.city && job.country && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>{job.city}, {job.country}</span>
                                        </div>
                                    )}

                                    {job.location_type && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Briefcase className="h-4 w-4" />
                                            <span>{job.location_type}</span>
                                        </div>
                                    )}

                                    {job.salary_range && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <DollarSign className="h-4 w-4" />
                                            <span>{job.salary_range}</span>
                                        </div>
                                    )}

                                    {job.job_level && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Badge variant="secondary">{job.job_level}</Badge>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Job Description */}
                    <Card className="shadow-elegant animate-fade-in-up">
                        <CardHeader>
                            <CardTitle>Job Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {job.description ? (
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                        {job.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic">
                                    No description provided for this position.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Apply Section */}
                    <Card className={`shadow-elegant animate-fade-in-up ${hasApplied ? 'border-2 border-green-500/20' : 'border-2 border-primary/20'}`}>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                {hasApplied ? (
                                    <>
                                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                                        <h3 className="text-2xl font-bold">Application Submitted!</h3>
                                        <p className="text-muted-foreground">
                                            You have already applied for this position. Our AI is reviewing your application
                                            and we'll get back to you soon!
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-bold">Ready to Apply?</h3>
                                        <p className="text-muted-foreground">
                                            Submit your application by uploading your CV and filling in your details.
                                            Our AI will review your application and get back to you soon!
                                        </p>
                                        <Button
                                            size="lg"
                                            className="text-lg px-8 py-6"
                                            onClick={handleApplyClick}
                                            disabled={!uploadLink || hasApplied}
                                        >
                                            Apply for this Position
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer Note */}
                    <div className="text-center text-sm text-muted-foreground pt-4">
                        <p>
                            By applying, you agree to our terms and conditions.
                            We respect your privacy and will keep your information confidential.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicJobView;