// src/pages/LinkedInCallback.tsx
// Handles LinkedIn OAuth callback

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exchangeCodeForToken, saveLinkedInTokens } from "@/lib/linkedinAuth";
import { supabase } from "@/integrations/supabase/client";

const LinkedInCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("error");
        setErrorMessage("Your session has expired. Please log in again.");
        toast({
          title: "Session Expired",
          description: "Please log in and try connecting LinkedIn again.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      // 2. Get the authorization code from URL
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // 3. Check for OAuth errors
      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || error);
        toast({
          title: "LinkedIn Authorization Failed",
          description: errorDescription || "Please try connecting again.",
          variant: "destructive",
        });
        return;
      }

      // 4. Verify we have the code
      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received from LinkedIn");
        toast({
          title: "Authorization Failed",
          description: "Missing authorization code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // 5. Verify state to prevent CSRF attacks
      const savedState = sessionStorage.getItem("linkedin_oauth_state");
      if (state !== savedState) {
        setStatus("error");
        setErrorMessage("Invalid state parameter. Possible CSRF attack.");
        toast({
          title: "Security Error",
          description: "Please try connecting again.",
          variant: "destructive",
        });
        return;
      }

      // 6. Exchange code for token
      console.log("Exchanging authorization code for access token...");
      const tokens = await exchangeCodeForToken(code);
      
      // 7. Save tokens to database
      console.log("Saving LinkedIn tokens...");
      await saveLinkedInTokens(tokens);

      // 8. Clean up
      sessionStorage.removeItem("linkedin_oauth_state");

      // 9. Success!
      setStatus("success");
      toast({
        title: "LinkedIn Connected!",
        description: "You can now post jobs to your LinkedIn company page.",
      });

      // 10. Redirect to import candidates page
      setTimeout(() => {
        navigate("/import-candidates");
      }, 2000);

    } catch (error: any) {
      console.error("LinkedIn OAuth callback error:", error);
      setStatus("error");
      
      // Provide specific error messages
      let errorMsg = "Failed to connect LinkedIn. ";
      
      if (error.message?.includes("Failed to fetch")) {
        errorMsg += "Network error - please check your internet connection.";
      } else if (error.message?.includes("CORS")) {
        errorMsg += "CORS error - this is a temporary development issue.";
      } else if (error.message?.includes("not authenticated")) {
        errorMsg += "Please log in and try again.";
      } else {
        errorMsg += error.message || "Please try again.";
      }
      
      setErrorMessage(errorMsg);
      
      toast({
        title: "Connection Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            {status === "loading" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting LinkedIn...
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                LinkedIn Connected!
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Connection Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Processing your LinkedIn authorization...
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-muted-foreground">
                Successfully connected to LinkedIn!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to import candidates...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Connection Error</p>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/connect-linkedin")}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate("/import-candidates")}
                  variant="outline"
                  className="flex-1"
                >
                  Go Back
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Make sure you're logged in</li>
                  <li>Check your internet connection</li>
                  <li>Try connecting again</li>
                  <li>Clear browser cache and cookies</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInCallback;