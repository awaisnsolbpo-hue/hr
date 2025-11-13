import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Interview {
  id: string;
  name: string;
  email: string;
  interview_status: string;
  interview_date?: string;
  interview_result?: string;
  ai_score?: number;
  created_at: string;
  jobs?: {
    title: string;
  };
}

const Interviews = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scheduledInterviews, setScheduledInterviews] = useState<Interview[]>([]);
  const [completedInterviews, setCompletedInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      // Fetch scheduled interviews (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      const { data: scheduled, error: scheduledError } = await supabase
        .from("candidates")
        .select(`
          *,
          jobs (
            title
          )
        `)
        .eq("interview_status", "scheduled")
        .gte("interview_date", now.toISOString())
        .lte("interview_date", nextWeek.toISOString())
        .order("interview_date", { ascending: true });

      if (scheduledError) throw scheduledError;

      // Fetch completed interviews
      const { data: completed, error: completedError } = await supabase
        .from("candidates")
        .select(`
          *,
          jobs (
            title
          )
        `)
        .eq("interview_status", "completed")
        .order("interview_date", { ascending: false });

      if (completedError) throw completedError;

      setScheduledInterviews(scheduled || []);
      setCompletedInterviews(completed || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return <Badge variant="outline">N/A</Badge>;
    
    const variants: Record<string, "default" | "destructive"> = {
      pass: "default",
      qualified: "default",
      fail: "destructive",
      failed: "destructive",
    };
    return <Badge variant={variants[result] || "outline"}>{result}</Badge>;
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

            <Button variant="ghost" size="default" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interviews</h1>
            <p className="text-muted-foreground">
              Manage scheduled and completed interviews
            </p>
          </div>

          <Tabs defaultValue="scheduled" className="space-y-6">
            <TabsList>
              <TabsTrigger value="scheduled">
                Scheduled ({scheduledInterviews.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedInterviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scheduled">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Interviews (Next 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : scheduledInterviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No scheduled interviews in the next 7 days
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Interview Date</TableHead>
                          <TableHead>AI Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledInterviews.map((interview) => (
                          <TableRow key={interview.id}>
                            <TableCell className="font-medium">
                              {interview.name}
                            </TableCell>
                            <TableCell>{interview.email}</TableCell>
                            <TableCell>{interview.jobs?.title || "N/A"}</TableCell>
                            <TableCell>
                              {interview.interview_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(interview.interview_date).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {interview.ai_score ? (
                                <Badge variant="secondary">{interview.ai_score}%</Badge>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : completedInterviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed interviews yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Interview Date</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>AI Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedInterviews.map((interview) => (
                          <TableRow key={interview.id}>
                            <TableCell className="font-medium">
                              {interview.name}
                            </TableCell>
                            <TableCell>{interview.email}</TableCell>
                            <TableCell>{interview.jobs?.title || "N/A"}</TableCell>
                            <TableCell>
                              {interview.interview_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(interview.interview_date).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getResultBadge(interview.interview_result)}</TableCell>
                            <TableCell>
                              {interview.ai_score ? (
                                <Badge variant="secondary">{interview.ai_score}%</Badge>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Interviews;
