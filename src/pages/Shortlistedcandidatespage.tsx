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
import { MessageSquare, ArrowLeft, Mail, Phone, Calendar, Briefcase, Loader2, Star, FileText, Video, Check, X, Filter, Download, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScheduleMeetingDialog from "@/components/ScheduleMeetingDialog";

interface ShortlistedCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ai_score?: number;
  cv_file_url?: string;
  job_id?: string;
  job_title?: string;
  status?: string;
  interview_status?: string;
  recording_url?: string;
  screen_recording_url?: string;
  scheduled_meeting_id?: string;
  scheduled_meeting_date?: string;
  created_at: string;
}

type FilterType = 'all' | 'hire' | 'not-hire';

const ShortlistedCandidatesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<ShortlistedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ShortlistedCandidate | null>(null);

  useEffect(() => {
    loadShortlistedCandidates();
  }, []);

  const loadShortlistedCandidates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch shortlisted candidates
      const { data, error } = await supabase
        .from("Shortlisted_candidates")
        .select("*, jobs(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch all scheduled meetings for this user
      const { data: meetingsData } = await supabase
        .from("scheduled_meetings")
        .select("id, candidate_email, meeting_date, meeting_status")
        .eq("user_id", user.id);

      // Create a map of email to meeting data
      const meetingsMap = new Map();
      if (meetingsData) {
        meetingsData.forEach((meeting: any) => {
          // Only store the meeting if status is not completed or cancelled
          if (meeting.meeting_status !== 'completed' && meeting.meeting_status !== 'cancelled') {
            // Store only if we don't have a meeting for this email, or if this one is earlier
            const existing = meetingsMap.get(meeting.candidate_email);
            if (!existing || new Date(meeting.meeting_date) < new Date(existing.meeting_date)) {
              meetingsMap.set(meeting.candidate_email, meeting);
            }
          }
        });
      }

      const formattedData: ShortlistedCandidate[] = (data || []).map((c: any) => {
        const meeting = meetingsMap.get(c.email);
        return {
          ...c,
          job_title: c.jobs?.title,
          scheduled_meeting_id: meeting?.id,
          scheduled_meeting_date: meeting?.meeting_date,
        };
      });

      setCandidates(formattedData);
      console.log('📊 Shortlisted Candidates Loaded:', formattedData.length);
    } catch (error: any) {
      console.error("Error loading shortlisted candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load shortlisted candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter candidates based on AI score
  const filteredCandidates = candidates.filter((candidate) => {
    if (filter === 'hire') {
      // Show candidates with AI score >= 50% (recommended to hire)
      return candidate.ai_score !== null && candidate.ai_score !== undefined && candidate.ai_score >= 50;
    } else if (filter === 'not-hire') {
      // Show candidates with AI score < 50% (not recommended to hire)
      return candidate.ai_score !== null && candidate.ai_score !== undefined && candidate.ai_score < 50;
    }
    // Show all candidates
    return true;
  });

  const hireCount = candidates.filter(c => c.ai_score !== null && c.ai_score !== undefined && c.ai_score >= 50).length;
  const notHireCount = candidates.filter(c => c.ai_score !== null && c.ai_score !== undefined && c.ai_score < 50).length;

  const handleScheduleMeeting = (candidate: ShortlistedCandidate) => {
    setSelectedCandidate(candidate);
    setScheduleMeetingOpen(true);
  };

  const handleScheduleSuccess = () => {
    // Reload candidates to refresh scheduled meeting data
    loadShortlistedCandidates();
    toast({
      title: "Success",
      description: "Meeting scheduled successfully!",
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
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Shortlisted Candidates</h1>
                  <p className="text-sm text-muted-foreground">
                    {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"} in final stage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <span>Shortlisted Candidates</span>
                <Badge variant="secondary">{candidates.length} Total</Badge>
              </CardTitle>
              
              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="gap-2"
                  >
                    All
                    <Badge variant="secondary" className="ml-1">{candidates.length}</Badge>
                  </Button>
                  <Button
                    variant={filter === 'hire' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('hire')}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Hire (≥50%)
                    <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800 border-green-200">
                      {hireCount}
                    </Badge>
                  </Button>
                  <Button
                    variant={filter === 'not-hire' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('not-hire')}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Not Hire (&lt;50%)
                    <Badge variant="secondary" className="ml-1 bg-red-100 text-red-800 border-red-200">
                      {notHireCount}
                    </Badge>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === 'hire' ? 'No Candidates to Hire' : 
                   filter === 'not-hire' ? 'No Candidates Below 50%' : 
                   'No Shortlisted Candidates'}
                </h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'Shortlist candidates from the qualified list'
                    : 'Try changing the filter to see more candidates'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Interview Status</TableHead>
                      <TableHead>Scheduled Meeting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shortlisted Date</TableHead>
                      <TableHead>Recordings</TableHead>
                      <TableHead>Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => {
                      const shouldHire = candidate.ai_score !== null && candidate.ai_score !== undefined && candidate.ai_score >= 50;
                      
                      return (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
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
                            {candidate.ai_score !== null && candidate.ai_score !== undefined ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{candidate.ai_score}%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.ai_score !== null && candidate.ai_score !== undefined ? (
                              shouldHire ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                  <Check className="h-3 w-3" />
                                  Hire
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
                                  <X className="h-3 w-3" />
                                  Not Hire
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary">N/A</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.interview_status ? (
                              <Badge variant="outline">{candidate.interview_status}</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.scheduled_meeting_date ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3 text-primary" />
                                  <span className="font-medium">
                                    {new Date(candidate.scheduled_meeting_date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(candidate.scheduled_meeting_date).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleScheduleMeeting(candidate)}
                                  className="mt-1 h-7 text-xs"
                                >
                                  <CalendarPlus className="h-3 w-3 mr-1" />
                                  Reschedule
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleScheduleMeeting(candidate)}
                                className="gap-2"
                              >
                                <CalendarPlus className="h-4 w-4" />
                                Schedule Meeting
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-pink-100 text-pink-800 border-pink-200">
                              Shortlisted
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(candidate.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {candidate.recording_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(candidate.recording_url, "_blank")}
                                  className="justify-start h-auto py-1 px-2"
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  <span className="text-xs">Recording</span>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground px-2">No recording</span>
                              )}
                              {candidate.screen_recording_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(candidate.screen_recording_url, "_blank")}
                                  className="justify-start h-auto py-1 px-2"
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  <span className="text-xs">Screen</span>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground px-2">No screen rec</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {candidate.cv_file_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(candidate.cv_file_url, "_blank")}
                                  className="gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Download CV
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No CV</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Schedule Meeting Dialog */}
      {selectedCandidate && (
        <ScheduleMeetingDialog
          candidate={{
            id: selectedCandidate.id,
            name: selectedCandidate.name,
            email: selectedCandidate.email,
            phone: selectedCandidate.phone,
            cv_file_url: selectedCandidate.cv_file_url,
            ai_score: selectedCandidate.ai_score,
            job_id: selectedCandidate.job_id,
            source: 'shortlisted',
          }}
          open={scheduleMeetingOpen}
          onOpenChange={setScheduleMeetingOpen}
          onSuccess={handleScheduleSuccess}
        />
      )}
    </div>
  );
};

export default ShortlistedCandidatesPage;