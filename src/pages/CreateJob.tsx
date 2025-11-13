import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, LogOut, Link as LinkIcon, FileText, ArrowRight, Linkedin, Loader2, AlertCircle, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isLinkedInConnected } from "@/lib/linkedinAuth";
import { getLinkedInOrganizations, shareJobPost } from "@/lib/linkedinApi";
import { getLinkedInJobDetails } from "@/lib/linkedinScraper";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CreateJob = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [importMethod, setImportMethod] = useState<"linkedin" | "manual" | null>(null);
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [scraping, setScraping] = useState(false);
    const [scrapingError, setScrapingError] = useState("");
    const [postToLinkedIn, setPostToLinkedIn] = useState(false);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [linkedinOrgs, setLinkedinOrgs] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [customQuestions, setCustomQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [formData, setFormData] = useState({
        title: "",
        closeDate: "",
        city: "",
        country: "",
        salaryMin: "",
        salaryMax: "",
        locationType: "",
        jobLevel: "",
        description: "",
    });

    useEffect(() => {
        checkLinkedInStatus();
    }, []);

    const checkLinkedInStatus = async () => {
        try {
            const connected = await isLinkedInConnected();
            setLinkedinConnected(connected);

            if (connected) {
                const orgs = await getLinkedInOrganizations();
                setLinkedinOrgs(orgs);
                if (orgs.length > 0) {
                    setSelectedOrg(orgs[0].id);
                }
            }
        } catch (error) {
            console.error("Error checking LinkedIn status:", error);
        }
    };

    const handleAddQuestion = () => {
        if (newQuestion.trim()) {
            setCustomQuestions([...customQuestions, newQuestion.trim()]);
            setNewQuestion("");
        }
    };

    const handleRemoveQuestion = (index: number) => {
        setCustomQuestions(customQuestions.filter((_, i) => i !== index));
    };

    const handleLinkedInImport = async () => {
        if (!linkedinUrl) {
            toast({
                title: "Missing URL",
                description: "Please enter a LinkedIn job URL.",
                variant: "destructive",
            });
            return;
        }

        if (!linkedinUrl.includes('linkedin.com/jobs/view/')) {
            toast({
                title: "Invalid URL",
                description: "Please enter a valid LinkedIn job posting URL.",
                variant: "destructive",
            });
            return;
        }

        setScraping(true);
        setScrapingError("");

        try {
            toast({
                title: "Scraping Job Details",
                description: "Fetching job information from LinkedIn...",
            });

            const jobData = await getLinkedInJobDetails(linkedinUrl);

            setFormData({
                title: jobData.title || "",
                closeDate: "",
                city: jobData.city || "",
                country: jobData.country || "",
                salaryMin: jobData.salaryMin || "",
                salaryMax: jobData.salaryMax || "",
                locationType: jobData.locationType || "",
                jobLevel: jobData.jobLevel || "",
                description: jobData.description || "",
            });

            toast({
                title: "Import Successful!",
                description: "Job details have been imported. Please review and edit if needed.",
            });

            setImportMethod("manual");

        } catch (error: any) {
            console.error("Scraping error:", error);
            setScrapingError(error.message || "Failed to scrape job details");

            toast({
                title: "Import Failed",
                description: error.message || "Could not fetch job details. Please add manually.",
                variant: "destructive",
            });
        } finally {
            setScraping(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            toast({
                title: "Missing Information",
                description: "Please fill in required fields (Title and Description).",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
                return;
            }

            // Convert questions array to JSON string
            const questionsJson = customQuestions.length > 0 ? JSON.stringify(customQuestions) : null;

            // Insert job into database
            const { data: job, error: jobError } = await supabase
                .from("jobs")
                .insert({
                    title: formData.title,
                    description: formData.description,
                    city: formData.city,
                    country: formData.country,
                    salary_min: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
                    salary_max: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
                    location_type: formData.locationType,
                    job_level: formData.jobLevel,
                    close_date: formData.closeDate || null,
                    questions: questionsJson,
                    user_id: user.id,
                    status: "active",
                    posted_to_linkedin: false,
                })
                .select()
                .single();

            if (jobError) throw jobError;

            // Post to LinkedIn if checkbox is checked
            if (postToLinkedIn && linkedinConnected && selectedOrg) {
                try {
                    toast({
                        title: "Posting to LinkedIn",
                        description: "Sharing your job on LinkedIn...",
                    });

                    const applyUrl = `${window.location.origin}/apply/${job.id}`;

                    const linkedinPostId = await shareJobPost(
                        selectedOrg,
                        formData.title,
                        formData.description,
                        applyUrl
                    );

                    await supabase
                        .from("jobs")
                        .update({
                            linkedin_post_id: linkedinPostId,
                            linkedin_posted_at: new Date().toISOString(),
                            linkedin_organization_id: selectedOrg,
                            posted_to_linkedin: true,
                        })
                        .eq("id", job.id);

                    toast({
                        title: "Success!",
                        description: "Job created and posted to LinkedIn!",
                    });
                } catch (linkedinError: any) {
                    console.error("LinkedIn posting error:", linkedinError);
                    toast({
                        title: "Job Created",
                        description: "Job created but failed to post to LinkedIn. You can post it manually later.",
                        variant: "destructive",
                    });
                }
            } else {
                toast({
                    title: "Job Created!",
                    description: "Your job posting has been created successfully.",
                });
            }

            setTimeout(() => {
                navigate("/jobs");
            }, 1500);
        } catch (error: any) {
            console.error("Error creating job:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to create job. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    // Initial method selection screen
    if (!importMethod) {
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
                            <Button variant="ghost" size="default" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl font-bold">Create New Job</h1>
                            <p className="text-muted-foreground">
                                Choose how you'd like to add your job posting
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card
                                className="hover-scale hover-glow cursor-pointer transition-all"
                                onClick={() => setImportMethod("linkedin")}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent mb-4">
                                        <LinkIcon className="h-6 w-6 text-primary-foreground" />
                                    </div>
                                    <CardTitle>Import from LinkedIn</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Paste a LinkedIn job URL and we'll automatically scrape and fill in all the details for you.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                className="hover-scale hover-glow cursor-pointer transition-all"
                                onClick={() => setImportMethod("manual")}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent mb-4">
                                        <FileText className="h-6 w-6 text-primary-foreground" />
                                    </div>
                                    <CardTitle>Add Manually</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Enter all job details manually through our intuitive form interface.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // LinkedIn import screen
    if (importMethod === "linkedin") {
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
                            <Button variant="ghost" size="default" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setImportMethod(null);
                                setLinkedinUrl("");
                                setScrapingError("");
                            }}
                        >
                            ← Back
                        </Button>

                        <div className="text-center space-y-4">
                            <h1 className="text-3xl font-bold">Import from LinkedIn</h1>
                            <p className="text-muted-foreground">
                                Paste the LinkedIn job posting URL below to automatically extract job details
                            </p>
                        </div>

                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                {scrapingError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{scrapingError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="linkedin-url">LinkedIn Job URL *</Label>
                                    <Input
                                        id="linkedin-url"
                                        placeholder="https://www.linkedin.com/jobs/view/..."
                                        value={linkedinUrl}
                                        onChange={(e) => {
                                            setLinkedinUrl(e.target.value);
                                            setScrapingError("");
                                        }}
                                        disabled={scraping}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Example: https://www.linkedin.com/jobs/view/1234567890/
                                    </p>
                                </div>

                                <Button
                                    variant="hero"
                                    size="lg"
                                    className="w-full"
                                    onClick={handleLinkedInImport}
                                    disabled={scraping || !linkedinUrl}
                                >
                                    {scraping ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Scraping Job Details...
                                        </>
                                    ) : (
                                        "Import Job Details"
                                    )}
                                </Button>

                                <div className="text-center">
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setImportMethod("manual");
                                            setLinkedinUrl("");
                                            setScrapingError("");
                                        }}
                                        disabled={scraping}
                                    >
                                        Or add job details manually
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2 text-sm text-blue-900">
                                        <p className="font-medium">How it works:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                                            <li>Paste a public LinkedIn job posting URL</li>
                                            <li>We'll automatically extract job title, description, location, and more</li>
                                            <li>Review and edit the details before posting</li>
                                            <li>Optionally post back to LinkedIn (requires connection)</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    // Manual form
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
                        <Button variant="ghost" size="default" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                    <Button variant="ghost" onClick={() => setImportMethod(null)}>
                        ← Back
                    </Button>

                    <div>
                        <h1 className="text-3xl font-bold mb-2">Add Job Details</h1>
                        <p className="text-muted-foreground">
                            Fill in the information about your job posting
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="title">Job Title *</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g., Senior Software Engineer"
                                            value={formData.title}
                                            onChange={(e) =>
                                                setFormData({ ...formData, title: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="closeDate">Close Date</Label>
                                        <Input
                                            id="closeDate"
                                            type="date"
                                            value={formData.closeDate}
                                            onChange={(e) =>
                                                setFormData({ ...formData, closeDate: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            placeholder="e.g., San Francisco"
                                            value={formData.city}
                                            onChange={(e) =>
                                                setFormData({ ...formData, city: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            placeholder="e.g., USA"
                                            value={formData.country}
                                            onChange={(e) =>
                                                setFormData({ ...formData, country: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="salaryMin">Salary Range (Min)</Label>
                                        <Input
                                            id="salaryMin"
                                            type="number"
                                            placeholder="e.g., 80000"
                                            value={formData.salaryMin}
                                            onChange={(e) =>
                                                setFormData({ ...formData, salaryMin: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="salaryMax">Salary Range (Max)</Label>
                                        <Input
                                            id="salaryMax"
                                            type="number"
                                            placeholder="e.g., 120000"
                                            value={formData.salaryMax}
                                            onChange={(e) =>
                                                setFormData({ ...formData, salaryMax: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="locationType">Location Type</Label>
                                        <Select
                                            value={formData.locationType}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, locationType: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select location type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover z-50">
                                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                                <SelectItem value="remote">Remote</SelectItem>
                                                <SelectItem value="onsite">Onsite</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="jobLevel">Job Level</Label>
                                        <Select
                                            value={formData.jobLevel}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, jobLevel: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select job level" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover z-50">
                                                <SelectItem value="entry">Entry</SelectItem>
                                                <SelectItem value="mid">Mid</SelectItem>
                                                <SelectItem value="senior">Senior</SelectItem>
                                                <SelectItem value="exec">Executive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="description">Full Job Description *</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Describe the role, responsibilities, requirements, and benefits..."
                                            rows={10}
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({ ...formData, description: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    {/* Custom Questions Section */}
                                    <div className="space-y-4 md:col-span-2 border-t pt-4">
                                        <div>
                                            <Label className="text-base">Custom Questions (Optional)</Label>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Add custom questions you want to ask candidates during application
                                            </p>
                                        </div>

                                        {customQuestions.length > 0 && (
                                            <div className="space-y-2">
                                                {customQuestions.map((question, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-2 p-3 bg-secondary rounded-lg"
                                                    >
                                                        <span className="flex-1 text-sm">{question}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveQuestion(index)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Enter a custom question..."
                                                value={newQuestion}
                                                onChange={(e) => setNewQuestion(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddQuestion();
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddQuestion}
                                                disabled={!newQuestion.trim()}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    {/* LinkedIn Posting Option */}
                                    {linkedinConnected && (
                                        <div className="space-y-4 md:col-span-2 border-t pt-4">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="post-linkedin"
                                                    checked={postToLinkedIn}
                                                    onCheckedChange={(checked) =>
                                                        setPostToLinkedIn(checked as boolean)
                                                    }
                                                />
                                                <label
                                                    htmlFor="post-linkedin"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                                >
                                                    <Linkedin className="h-4 w-4 text-blue-600" />
                                                    Post this job to LinkedIn
                                                </label>
                                            </div>

                                            {postToLinkedIn && linkedinOrgs.length > 0 && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="linkedin-org">Select Organization</Label>
                                                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select organization" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-popover z-50">
                                                            {linkedinOrgs.map((org) => (
                                                                <SelectItem key={org.id} value={org.id}>
                                                                    {org.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!linkedinConnected && (
                                        <div className="md:col-span-2 border-t pt-4">
                                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Linkedin className="h-8 w-8 text-blue-600" />
                                                    <div>
                                                        <p className="font-medium">Connect LinkedIn</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Post jobs directly to LinkedIn
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate("/connect-linkedin")}
                                                >
                                                    Connect
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    variant="hero"
                                    size="lg"
                                    className="w-full group"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Job...
                                        </>
                                    ) : (
                                        <>
                                            Create Job
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateJob;