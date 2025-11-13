import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { initiateLinkedInOAuth } from "@/lib/linkedinAuth";
import { Badge } from "@/components/ui/badge";

export const LinkedInConnectionCard = () => {
    const { toast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [checking, setChecking] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setChecking(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('linkedin_access_token')
                .eq('id', user.id)
                .single();

            setIsConnected(!!profile?.linkedin_access_token);
        } catch (error) {
            console.error("Check connection error:", error);
        } finally {
            setChecking(false);
        }
    };

    const handleConnect = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast({
                title: "Not Logged In",
                description: "Please log in first to connect LinkedIn",
                variant: "destructive",
            });
            return;
        }
        initiateLinkedInOAuth();
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
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

            setIsConnected(false);
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
            setDisconnecting(false);
        }
    };

    return (
        <Card className="hover-scale hover-glow transition-all relative">
            <CardHeader>
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 mx-auto">
                    <Linkedin className="h-8 w-8 text-white" />
                </div>
                {isConnected && (
                    <Badge className="absolute top-4 right-4 bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                    </Badge>
                )}
                <CardTitle className="text-center">LinkedIn Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-center text-muted-foreground mb-6">
                    Connect your LinkedIn account to post jobs directly to LinkedIn
                </p>
                {!isConnected ? (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleConnect}
                        disabled={checking}
                    >
                        <Linkedin className="h-4 w-4 mr-2" />
                        {checking ? "Checking..." : "Connect LinkedIn"}
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                    >
                        {disconnecting ? (
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
    );
};