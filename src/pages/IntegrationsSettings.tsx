import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, LogOut, Mail, Linkedin, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { initiateGmailOAuth } from "@/lib/gmailAuth";
import { initiateLinkedInOAuth } from "@/lib/linkedinAuth";
import { Badge } from "@/components/ui/badge";

const IntegrationsSettings = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [gmailConnected, setGmailConnected] = useState(false);
    const [linkedinConnected, setLinkedinConnected] = useState(false);
    const [checking, setChecking] = useState(true);
    const [disconnectingGmail, setDisconnectingGmail] = useState(false);
    const [disconnectingLinkedIn, setDisconnectingLinkedIn] = useState(false);

    useEffect(() => {
        checkConnections();
    }, []);

    const checkConnections = async () => {
        setChecking(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('gmail_access_token, linkedin_access_token')
                .eq('id', user.id)
                .single();

            if (profile) {
                setGmailConnected(!!profile.gmail_access_token);
                setLinkedinConnected(!!profile.linkedin_access_token);
            }
        } catch (error) {
            console.error("Check connections error:", error);
        } finally {
            setChecking(false);
        }
    };

    const disconnectGmail = async () => {
        setDisconnectingGmail(true);
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
        } finally {
            setDisconnectingGmail(false);
        }
    };

    const disconnectLinkedIn = async () => {
        setDisconnectingLinkedIn(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    linkedin_access_token: null,
                    linkedin_company_id: null,
                    linkedin_connected_at: null,
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
        } finally {
            setDisconnectingLinkedIn(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
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
                        <Button variant="ghost" size="default" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                        <p className="text-muted-foreground">
                            Manage your connected accounts and integrations
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Gmail Integration */}
                        <Card className="hover-scale hover-glow transition-all relative">
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
                                <CardTitle className="text-center">Gmail</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect your Gmail account to automatically import candidate emails and attachments
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
                                        disabled={checking}
                                    >
                                        <Mail className="h-4 w-4 mr-2" />
                                        {checking ? "Checking..." : "Connect Gmail"}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={disconnectGmail}
                                        disabled={disconnectingGmail}
                                    >
                                        {disconnectingGmail ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Disconnect
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* LinkedIn Integration */}
                        <Card className="hover-scale hover-glow transition-all relative">
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
                                <CardTitle className="text-center">LinkedIn</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect your LinkedIn account to post jobs directly to LinkedIn
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
                                        disabled={checking}
                                    >
                                        <Linkedin className="h-4 w-4 mr-2" />
                                        {checking ? "Checking..." : "Connect LinkedIn"}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={disconnectLinkedIn}
                                        disabled={disconnectingLinkedIn}
                                    >
                                        {disconnectingLinkedIn ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Disconnect
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="text-center">
                        <Button variant="ghost" onClick={() => navigate(-1)}>
                            ← Back
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IntegrationsSettings;