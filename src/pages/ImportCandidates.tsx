import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Sparkles,
    LogOut,
    Upload,
    Mail,
    Link as LinkIcon,
    ArrowRight,
    Copy,
    CheckCircle2,
    XCircle,
    Briefcase,
    AlertCircle,
    Linkedin,
    Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadModal } from "@/components/FileUploadModal";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initiateGmailOAuth } from "@/lib/gmailAuth";
import { initiateLinkedInOAuth } from "@/lib/linkedinAuth";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Job {
    id: string;
    title: string;
    status: string;
    created_at: string;
}

const ImportCandidates = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");
    const [generatingLink, setGeneratingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [checkingConnection, setCheckingConnection] = useState(true);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [loadingJobs, setLoadingJobs] = useState(true);

    useEffect(() => {
        checkConnections();
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoadingJobs(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("jobs")
                .select("id, title, status, created_at")
                .eq("user_id", user.id)
                .eq("status", "active")
                .order("created_at", { ascending: false });

            if (error) throw error;

            setJobs(data || []);

            // Auto-select first job if available
            if (data && data.length > 0) {
                setSelectedJobId(data[0].id);
            }
        } catch (error: any) {
            console.error("Fetch jobs error:", error);
            toast({
                title: "Error",
                description: "Failed to load jobs",
                variant: "destructive",
            });
        } finally {
            setLoadingJobs(false);
        }
    };

    const checkConnections = async () => {
        setCheckingConnection(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('gmail_access_token, linkedin_access_token, linkedin_connected')
                .eq('id', user.id)
                .single();

            if (profile) {
                setGmailConnected(!!profile.gmail_access_token);
                setLinkedinConnected(!!profile.linkedin_connected);
            }
        } catch (error) {
            console.error("Check connections error:", error);
        } finally {
            setCheckingConnection(false);
        }
    };

    const disconnectGmail = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    gmail_access_token: null,
                    gmail_refresh_token: null,
                    gmail_token_expires_at: null,
                    gmail_connected_at: null,
                })
                .eq('id', user.id);

            if (error) throw error;

            setGmailConnected(false);
            toast({
                title: "Disconnected",
                description: "Gmail has been disconnected",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const disconnectLinkedIn = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    linkedin_access_token: null,
                    linkedin_refresh_token: null,
                    linkedin_token_expires_at: null,
                    linkedin_connected: false,
                    linkedin_company_id: null,
                })
                .eq('id', user.id);

            if (error) throw error;

            setLinkedinConnected(false);
            toast({
                title: "Disconnected",
                description: "LinkedIn has been disconnected",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const generatePublicLink = async () => {
        if (!selectedJobId) {
            toast({
                title: "Select a Job",
                description: "Please select a job first",
                variant: "destructive",
            });
            return;
        }

        setGeneratingLink(true);
        try {
            const user = await supabase.auth.getUser();
            if (!user.data.user) throw new Error("Not authenticated");

            const linkCode = Math.random().toString(36).substring(2, 15);

            const { error } = await supabase
                .from('upload_links')
                .insert({
                    user_id: user.data.user.id,
                    link_code: linkCode,
                    job_id: selectedJobId,
                });

            if (error) throw error;

            const publicUrl = `${window.location.origin}/upload/${linkCode}`;
            setGeneratedLink(publicUrl);

            toast({
                title: "Link Generated!",
                description: "Share this link with candidates",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setLinkCopied(true);
        toast({
            title: "Copied!",
            description: "Link copied to clipboard",
        });
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleManualUpload = () => {
        if (!selectedJobId) {
            toast({
                title: "Select a Job",
                description: "Please select a job first",
                variant: "destructive",
            });
            return;
        }
        setShowUploadModal(true);
    };

    const handleGmailImport = () => {
        if (!selectedJobId) {
            toast({
                title: "Select a Job",
                description: "Please select a job first",
                variant: "destructive",
            });
            return;
        }
        navigate(`/gmail-import?jobId=${selectedJobId}`);
    };

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

                        <Button variant="ghost" size="default" onClick={() => navigate("/")}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                    {/* Page Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl font-bold">Let's get your candidates in</h1>
                        <p className="text-lg text-muted-foreground">
                            Before reviewing candidates, choose how to import them
                        </p>
                    </div>

                    {/* Job Selection */}
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                Select Job Position
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {jobs.length === 0 && !loadingJobs ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No active jobs found. Please{" "}
                                        <Link to="/create-job" className="font-medium underline">
                                            create a job
                                        </Link>{" "}
                                        first before importing candidates.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="job-select">
                                            Which job are these candidates applying for? *
                                        </Label>
                                        <Select
                                            value={selectedJobId}
                                            onValueChange={setSelectedJobId}
                                            disabled={loadingJobs}
                                        >
                                            <SelectTrigger id="job-select">
                                                <SelectValue placeholder={loadingJobs ? "Loading jobs..." : "Select a job"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover z-50">
                                                {jobs.map((job) => (
                                                    <SelectItem key={job.id} value={job.id}>
                                                        {job.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedJobId && (
                                        <div className="bg-primary/5 p-3 rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
                                                All imported candidates will be added to:{" "}
                                                <span className="font-medium text-foreground">
                                                    {jobs.find((j) => j.id === selectedJobId)?.title}
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Import Options - 5 Cards Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {/* Manual Upload */}
                        <Card
                            className={`hover-scale hover-glow transition-all animate-fade-in-up ${!selectedJobId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                }`}
                            onClick={handleManualUpload}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent mb-4 mx-auto">
                                    <Upload className="h-8 w-8 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-center">Manually Upload Candidates</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-center text-muted-foreground mb-6">
                                    Drag and drop CV files (PDF or ZIP) or browse to upload them
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={!selectedJobId}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Files
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Gmail Import */}
                        <Card
                            className="hover-scale hover-glow transition-all animate-fade-in-up relative"
                            style={{ animationDelay: "100ms" }}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 mb-4 mx-auto">
                                    <Mail className="h-8 w-8 text-white" />
                                </div>
                                {gmailConnected && (
                                    <Badge className="absolute top-4 right-4 bg-green-500">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Connected
                                    </Badge>
                                )}
                                <CardTitle className="text-center">
                                     Import via Email
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect your Gmail account to import candidate emails and
                                    attachments
                                </p>
                                {!gmailConnected ? (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={async () => {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            if (!session) {
                                                toast({
                                                    title: "Not Logged In",
                                                    description: "Please log in first to connect Gmail",
                                                    variant: "destructive",
                                                });
                                                navigate('/login');
                                                return;
                                            }
                                            initiateGmailOAuth();
                                        }}
                                        disabled={checkingConnection}
                                    >
                                        <Mail className="h-4 w-4 mr-2" />
                                        {checkingConnection ? "Checking..." : "Connect Gmail"}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={handleGmailImport}
                                            disabled={!selectedJobId}
                                        >
                                            <Mail className="h-4 w-4 mr-2" />
                                            Import from Gmail
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={disconnectGmail}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Disconnect
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* LinkedIn Connection */}
                        <Card
                            className="hover-scale hover-glow transition-all animate-fade-in-up relative"
                            style={{ animationDelay: "150ms" }}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 mx-auto">
                                    <Linkedin className="h-8 w-8 text-white" />
                                </div>
                                {linkedinConnected && (
                                    <Badge className="absolute top-4 right-4 bg-green-500">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Connected
                                    </Badge>
                                )}
                                <CardTitle className="text-center">
                                    LinkedIn Integration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect LinkedIn to post jobs directly to your company page
                                </p>
                                {!linkedinConnected ? (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={async () => {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            if (!session) {
                                                toast({
                                                    title: "Not Logged In",
                                                    description: "Please log in first to connect LinkedIn",
                                                    variant: "destructive",
                                                });
                                                navigate('/login');
                                                return;
                                            }
                                            initiateLinkedInOAuth();
                                        }}
                                        disabled={checkingConnection}
                                    >
                                        <Linkedin className="h-4 w-4 mr-2" />
                                        {checkingConnection ? "Checking..." : "Connect LinkedIn"}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={disconnectLinkedIn}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Disconnect
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Indeed Integration */}
                        <Card
                            className="hover-scale hover-glow transition-all animate-fade-in-up relative"
                            style={{ animationDelay: "200ms" }}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 mx-auto">
                                    <Globe className="h-8 w-8 text-white" />
                                </div>
                                <CardTitle className="text-center">
                                    Indeed Integration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect your Indeed account to import candidates and manage job postings
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        toast({
                                            title: "Coming Soon",
                                            description: "Indeed integration is coming soon!",
                                        });
                                    }}
                                    disabled={!selectedJobId}
                                >
                                    <Globe className="h-4 w-4 mr-2" />
                                    Connect Indeed
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Share Link */}
                        <Card
                            className="hover-scale hover-glow transition-all animate-fade-in-up"
                            style={{ animationDelay: "250ms" }}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent mb-4 mx-auto">
                                    <LinkIcon className="h-8 w-8 text-primary-foreground" />
                                </div>
                                <CardTitle className="text-center">Share Public Upload Link</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-center text-muted-foreground mb-6">
                                    Generate a shareable link that candidates can use to upload their CVs
                                    directly
                                </p>
                                {!generatedLink ? (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={generatePublicLink}
                                        disabled={generatingLink || !selectedJobId}
                                    >
                                        <LinkIcon className="h-4 w-4 mr-2" />
                                        {generatingLink ? "Generating..." : "Generate Link"}
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                value={generatedLink}
                                                readOnly
                                                className="text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={copyLink}
                                            >
                                                {linkCopied ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="w-full text-sm"
                                            onClick={() => setGeneratedLink("")}
                                        >
                                            Generate New Link
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Skip Option */}
                    <div className="text-center pt-8">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => navigate("/dashboard")}
                            className="group"
                        >
                            Skip for Now
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </div>
            </main>

            <FileUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                jobId={selectedJobId}
            />
        </div>
    );
};

export default ImportCandidates;