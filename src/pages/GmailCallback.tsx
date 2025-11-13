// src/pages/GmailCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exchangeCodeForToken, saveGmailTokens } from "@/lib/gmailAuth"; // ✅ FIXED: Removed 's' from exchangeCodeForTokens
import { useToast } from "@/hooks/use-toast";

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Gmail...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        // Exchange code for tokens
        setMessage("Exchanging authorization code...");
        const tokens = await exchangeCodeForToken(code);

        // Save tokens to database
        setMessage("Saving credentials...");
        await saveGmailTokens(tokens);

        setStatus("success");
        setMessage("Gmail connected successfully!");

        // Redirect to gmail-import page after 2 seconds
        setTimeout(() => {
          navigate("/gmail-import");
        }, 2000);
      } catch (err: any) {
        console.error("Gmail OAuth callback error:", err);
        setStatus("error");
        setMessage(err.message || "Failed to connect Gmail. Please try again.");
        
        toast({
          title: "Connection Failed",
          description: err.message || "Failed to connect Gmail",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Gmail Connection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
              <p className="text-center text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-center text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting...</p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="h-12 w-12 text-red-600" />
              <p className="text-center text-gray-600">{message}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigate("/import-candidates")} variant="outline">
                  Go Back
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailCallback;