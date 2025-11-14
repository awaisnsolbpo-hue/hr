import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ArrowLeft, Mail, Phone, Calendar, Briefcase, Loader2, Star, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ai_score?: number;
  cv_file_url?: string;
  job_id?: string;
  job_title?: string;
  status?: string;
  created_at: string;
  source: string;
}

const TotalCandidatesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch ONLY from Applicant table
      const { data: applicants, error: applicantsError } = await supabase
        .from("Applicant")
        .select("*, jobs(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (applicantsError) throw applicantsError;

      // Format applicants data
      const allCandidates: Candidate[] = (applicants || []).map((c: any) => ({
        ...c,
        source: "Applicant",
        job_title: c.jobs?.title,
      }));

      // Deduplicate by email
      const uniqueCandidates = deduplicateByEmail(allCandidates);

      setCandidates(uniqueCandidates);
      console.log('📊 Total Candidates Loaded (Applicants only):', uniqueCandidates.length);
    } catch (error: any) {
      console.error("Error loading candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deduplicateByEmail = (candidates: Candidate[]): Candidate[] => {
    const seen = new Map<string, Candidate>();
    candidates.forEach((candidate) => {
      const email = candidate.email?.toLowerCase();
      if (email && !seen.has(email)) {
        seen.set(email, candidate);
      }
    });
    return Array.from(seen.values());
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Applicant":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Client":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Total Candidates</h1>
                  <p className="text-sm text-muted-foreground">
                    {candidates.length} unique {candidates.length === 1 ? "candidate" : "candidates"}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate("/import-candidates")}>
              Import Candidates
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Candidates</span>
              <Badge variant="secondary">{candidates.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Candidates Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Import candidates or wait for applications
                </p>
                <Button onClick={() => navigate("/import-candidates")}>
                  Import Candidates
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Job Applied</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{candidate.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              <a
                                href={`mailto:${candidate.email}`}
                                className="hover:text-primary"
                              >
                                {candidate.email}
                              </a>
                            </div>
                            {candidate.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {candidate.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSourceColor(candidate.source)}>
                            {candidate.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {candidate.job_title ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Briefcase className="h-3 w-3" />
                              {candidate.job_title}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {candidate.ai_score ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{candidate.ai_score}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {candidate.status ? (
                            <Badge variant="secondary">{candidate.status}</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(candidate.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {candidate.cv_file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(candidate.cv_file_url, "_blank")}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TotalCandidatesPage;