// src/pages/ConnectLinkedIn.tsx - Updated
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, LogOut, Linkedin, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { initiateLinkedInOAuth, isLinkedInConnected } from "@/lib/linkedinAuth";

const ConnectLinkedIn = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkLinkedInConnection();
    }, []);

    const checkLinkedInConnection = async () => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
                return;
            }

            // Check if user already has LinkedIn connected
            const connected = await isLinkedInConnected();

            if (connected) {
                // Already connected, proceed to next step
                toast({
                    title: "Already Connected",
                    description: "Your LinkedIn account is already connected.",
                });
                navigate("/import-candidates");
            }
        } catch (error) {
            console.error("Error checking LinkedIn connection:", error);
        } finally {
            setChecking(false);
        }
    };

    const handleConnectLinkedIn = async () => {
        setLoading(true);
        setError(null);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
                return;
            }

            // Initiate LinkedIn OAuth flow
            initiateLinkedInOAuth();
        } catch (error: any) {
            console.error("LinkedIn connection error:", error);
            setError(error.message || "Failed to connect to LinkedIn. Please try again.");
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast({
                title: "Error",
                description: "Failed to log out. Please try again.",
                variant: "destructive",
            });
        } else {
            navigate("/login");
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                    Checking connection status...
                </div>
            </div>
        );
    }

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
                    <div className="text-center space-y-4">
                        <div className="flex justify-center mb-6">
                            <div className="p-6 rounded-full bg-gradient-to-br from-primary to-accent">
                                <Linkedin className="h-12 w-12 text-primary-foreground" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Connect Your LinkedIn Account</h1>
                        <p className="text-muted-foreground text-lg">
                            To continue, please connect your LinkedIn account. This allows us to post
                            jobs and fetch applicants.
                        </p>
                    </div>

                    <Card className="hover-glow">
                        <CardHeader>
                            <CardTitle>LinkedIn Authorization Required</CardTitle>
                            <CardDescription>
                                We need your permission to access the following:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                    <div>
                                        <p className="font-medium">Basic Profile Information</p>
                                        <p className="text-sm text-muted-foreground">
                                            Your name and email address
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                    <div>
                                        <p className="font-medium">Company Details</p>
                                        <p className="text-sm text-muted-foreground">
                                            Access to your organization information
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                    <div>
                                        <p className="font-medium">Job Posting</p>
                                        <p className="text-sm text-muted-foreground">
                                            Ability to create and manage job postings
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                variant="hero"
                                size="lg"
                                className="w-full gap-2"
                                onClick={handleConnectLinkedIn}
                                disabled={loading}
                            >
                                <Linkedin className="h-5 w-5" />
                                {loading ? "Connecting..." : "Connect LinkedIn"}
                            </Button>

                            <p className="text-sm text-muted-foreground text-center">
                                You'll be redirected to LinkedIn to authorize access. We'll bring you back
                                here once completed.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default ConnectLinkedIn;