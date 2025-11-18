import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Video, Sparkles, Shield } from "lucide-react";

const InterviewLandingPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNotScheduled, setShowNotScheduled] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOtherStatus, setShowOtherStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("Qualified_For_Final_Interview" as any)
        .select("email, interview_status, name")
        .eq("email", email.trim())
        .maybeSingle();
   console.log(data);
      if (error) {
        console.error("Supabase query error:", error);
        toast({
          title: "Error",
          description: "Failed to verify your information. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if email exists in database
      if (!data) {
        setShowNotScheduled(true);
        return;
      }

      // Check interview status - cast to any to handle type mismatch
      const candidateData = data as any;
      const interviewStatus = candidateData?.interview_status?.trim() || "";

      if (interviewStatus === "Scheduled") {
        // Status is Scheduled - redirect to interview room
        navigate(`/interview-room?email=${encodeURIComponent(email.trim())}`);
      } else if (interviewStatus === "Completed") {
        // Status is Completed - show completed dialog
        setShowCompleted(true);
      } else if (interviewStatus) {
        // Other status (e.g., "In Progress", "Cancelled", etc.)
        setStatusMessage(interviewStatus);
        setShowOtherStatus(true);
      } else {
        // No status set - treat as not scheduled
        setShowNotScheduled(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">AI Interview Portal</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Info */}
            <div className="space-y-6">
              <div className="inline-block">
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Interviews
                </div>
              </div>
              <h2 className="text-5xl font-bold text-foreground leading-tight">
                Welcome to Your
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  AI Interview
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Experience a professional, AI-driven interview process. Our advanced system conducts personalized interviews tailored to your background and the position.
              </p>
              
              {/* Features */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Real-time Interaction</h3>
                    <p className="text-sm text-muted-foreground">Live voice conversation with our AI interviewer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Personalized Questions</h3>
                    <p className="text-sm text-muted-foreground">Custom questions based on your profile and role</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Secure & Private</h3>
                    <p className="text-sm text-muted-foreground">Your interview data is encrypted and secure</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <Card className="shadow-lg border-border/50">
              <CardHeader>
                <CardTitle>Access Your Interview</CardTitle>
                <CardDescription>
                  Enter your details to join your scheduled AI interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Access Interview Room"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Not Scheduled Dialog */}
      <AlertDialog open={showNotScheduled} onOpenChange={setShowNotScheduled}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview Not Scheduled</AlertDialogTitle>
            <AlertDialogDescription>
              We couldn't find an interview scheduled for this email address. Please check your email or contact our support team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowNotScheduled(false)}>
              Try Again
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interview Completed Dialog */}
      <AlertDialog open={showCompleted} onOpenChange={setShowCompleted}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview Already Completed</AlertDialogTitle>
            <AlertDialogDescription>
              This interview has already been completed. If you believe this is an error, please contact our support team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowCompleted(false)}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Other Status Dialog */}
      <AlertDialog open={showOtherStatus} onOpenChange={setShowOtherStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview Status: {statusMessage}</AlertDialogTitle>
            <AlertDialogDescription>
              Your interview status is currently "{statusMessage}". This interview is not available at this time. Please contact our support team if you have any questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowOtherStatus(false)}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InterviewLandingPage;

