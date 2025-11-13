import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    Mail,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Download,
    FileText
} from "lucide-react";
import { isGmailConnected } from "@/lib/gmailAuth";
import {
    searchGmailMessages,
    downloadGmailAttachment,
    getResumeAttachment,
    type EmailData
} from "@/lib/gmailApi";
import { supabase } from "@/integrations/supabase/client";

interface ImportProgress {
    total: number;
    current: number;
    succeeded: number;
    failed: number;
    status: "idle" | "importing" | "complete";
}

const GmailImport = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get("jobId");

    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("has:attachment (resume OR CV)");
    const [emails, setEmails] = useState<EmailData[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState<ImportProgress>({
        total: 0,
        current: 0,
        succeeded: 0,
        failed: 0,
        status: "idle",
    });

    // Check Gmail connection on mount
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connected = await isGmailConnected();
                setIsConnected(connected);

                if (!connected) {
                    toast({
                        title: "Gmail Not Connected",
                        description: "Please connect your Gmail account first.",
                        variant: "destructive",
                    });
                    setTimeout(() => navigate("/import-candidates"), 2000);
                }
            } catch (error) {
                console.error("Connection check error:", error);
                toast({
                    title: "Error",
                    description: "Failed to check Gmail connection",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        checkConnection();
    }, [navigate, toast]);

    // Search emails
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast({
                title: "Empty Query",
                description: "Please enter a search query",
                variant: "destructive",
            });
            return;
        }

        setIsSearching(true);
        setEmails([]);
        setSelectedEmails(new Set());

        try {
            const results = await searchGmailMessages(searchQuery, 20);
            setEmails(results);

            // Auto-select emails with resume attachments
            const autoSelected = new Set(
                results
                    .filter((email) => email.hasResume)
                    .map((email) => email.id)
            );
            setSelectedEmails(autoSelected);

            toast({
                title: "Search Complete",
                description: `Found ${results.length} emails`,
            });
        } catch (error) {
            console.error("Search error:", error);
            toast({
                title: "Search Failed",
                description: error instanceof Error ? error.message : "Failed to search emails",
                variant: "destructive",
            });
        } finally {
            setIsSearching(false);
        }
    };

    // Toggle email selection
    const toggleEmail = (emailId: string) => {
        setSelectedEmails((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(emailId)) {
                newSet.delete(emailId);
            } else {
                newSet.add(emailId);
            }
            return newSet;
        });
    };

    // Import selected candidates
    const handleImport = async () => {
        if (selectedEmails.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select at least one email to import",
                variant: "destructive",
            });
            return;
        }

        const selectedEmailData = emails.filter((email) => selectedEmails.has(email.id));

        setProgress({
            total: selectedEmailData.length,
            current: 0,
            succeeded: 0,
            failed: 0,
            status: "importing",
        });

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "Please log in to import candidates",
                variant: "destructive",
            });
            return;
        }

        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < selectedEmailData.length; i++) {
            const email = selectedEmailData[i];

            try {
                // Find resume attachment
                const resumeAttachment = getResumeAttachment(email);

                if (!resumeAttachment) {
                    throw new Error("No resume attachment found");
                }

                // Download attachment
                const blob = await downloadGmailAttachment(email.id, resumeAttachment.attachmentId);

                // Generate unique filename with user_id path
                const timestamp = Date.now();
                const sanitizedName = email.from.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
                const extension = resumeAttachment.filename.split(".").pop() || "pdf";
                const filename = `${user.id}/gmail/${sanitizedName}_${timestamp}.${extension}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from("candidate-cvs")
                    .upload(filename, blob, {
                        contentType: resumeAttachment.mimeType,
                        upsert: false,
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from("candidate-cvs")
                    .getPublicUrl(filename);

                // FIXED: Save to Client table instead of candidates
                const clientData: any = {
                    name: email.from,
                    email: email.fromEmail,
                    cv_file_url: urlData.publicUrl,
                    status: "pending",
                    user_id: user.id,
                    notes: `Imported from Gmail. Subject: ${email.subject}`,
                };

                // Add job_id if provided
                if (jobId) {
                    clientData.job_id = jobId;
                }

                const { error: dbError } = await supabase
                    .from("Client")
                    .insert(clientData);

                if (dbError) throw dbError;

                succeeded++;
            } catch (error) {
                console.error(`Failed to import ${email.from}:`, error);
                failed++;
            }

            // Update progress
            setProgress((prev) => ({
                ...prev,
                current: i + 1,
                succeeded,
                failed,
            }));
        }

        // Complete
        setProgress((prev) => ({ ...prev, status: "complete" }));

        toast({
            title: "Import Complete",
            description: `Successfully imported ${succeeded} candidates. Failed: ${failed}`,
        });

        // Redirect after 3 seconds
        setTimeout(() => {
            navigate("/candidates");
        }, 3000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isConnected) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/import-candidates")}
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Import Options
                    </Button>

                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Mail className="h-8 w-8 text-primary" />
                        Import from Gmail
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Search your Gmail for candidate applications and import them automatically
                    </p>
                    {jobId && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Candidates will be imported to the selected job
                        </div>
                    )}
                </div>

                {/* Search Section */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Search Emails</CardTitle>
                        <CardDescription>
                            Use Gmail search syntax to find candidate emails
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder='e.g. has:attachment subject:"application"'
                                className="flex-1"
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching}
                            >
                                {isSearching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                                <span className="ml-2">Search</span>
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Examples: <code>has:attachment (resume OR CV)</code> • <code>subject:application</code> • <code>from:jobs@company.com</code>
                        </p>
                    </CardContent>
                </Card>

                {/* Progress Section */}
                {progress.status === "importing" && (
                    <Card className="mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Importing Candidates...</h3>
                                    <span className="text-sm text-gray-600">
                                        {progress.current} / {progress.total}
                                    </span>
                                </div>
                                <Progress
                                    value={(progress.current / progress.total) * 100}
                                    className="h-2"
                                />
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-600">
                                        ✓ Succeeded: {progress.succeeded}
                                    </span>
                                    <span className="text-red-600">
                                        ✗ Failed: {progress.failed}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Success Section */}
                {progress.status === "complete" && (
                    <Card className="mb-6 border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                                <div>
                                    <h3 className="font-semibold text-green-900">Import Complete!</h3>
                                    <p className="text-sm text-green-700">
                                        Successfully imported {progress.succeeded} candidates.
                                        {progress.failed > 0 && ` ${progress.failed} failed.`}
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Redirecting to candidates page...
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results Section */}
                {emails.length > 0 && progress.status === "idle" && (
                    <>
                        <Card className="mb-4">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Found {emails.length} Emails</CardTitle>
                                        <CardDescription>
                                            {selectedEmails.size} selected for import
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={handleImport}
                                        disabled={selectedEmails.size === 0}
                                        className="gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Import {selectedEmails.size} Selected
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>

                        <div className="space-y-3">
                            {emails.map((email) => (
                                <Card
                                    key={email.id}
                                    className={`transition-all cursor-pointer hover:shadow-md ${selectedEmails.has(email.id) ? "border-primary bg-blue-50" : ""
                                        }`}
                                    onClick={() => toggleEmail(email.id)}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedEmails.has(email.id)}
                                                onCheckedChange={() => toggleEmail(email.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                            <p className="font-semibold truncate">{email.from}</p>
                                                        </div>
                                                        <p className="text-sm text-gray-600 truncate">
                                                            {email.fromEmail}
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-900 mt-2 truncate">
                                                            {email.subject}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {email.date}
                                                        </p>
                                                        {email.snippet && (
                                                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                                                {email.snippet}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        {email.hasResume && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                                <FileText className="h-3 w-3" />
                                                                Resume
                                                            </span>
                                                        )}
                                                        {email.attachments.length > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                {email.attachments.length} attachment{email.attachments.length > 1 ? "s" : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {email.attachments.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <p className="text-xs font-medium text-gray-700 mb-2">
                                                            Attachments:
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {email.attachments.map((att, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs"
                                                                >
                                                                    <FileText className="h-3 w-3" />
                                                                    <span className="truncate max-w-[200px]">
                                                                        {att.filename}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* No Results */}
                {!isSearching && emails.length === 0 && progress.status === "idle" && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                                No emails found. Try a different search query.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default GmailImport;