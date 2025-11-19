import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Sparkles,
    ArrowLeft,
    Search,
    Download,
    Calendar,
    MoreVertical,
    Eye,
    MoveRight,
    PenSquare,
    Trash2,
} from "lucide-react";
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
import ScheduleMeetingDialog from "@/components/ScheduleMeetingDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone?: string;
    interview_status?: string;
    interview_date?: string;
    interview_result?: string;
    ai_score?: number;
    Score?: number;
    cv_file_url?: string;
    created_at: string;
    updated_at?: string;
    job_id?: string;
    user_id?: string;
    source: 'Applicant' | 'Shortlisted' | 'Final Interview' | 'Client';
    stage_priority: number;
    Transcript?: string;
    'Recording URL'?: string;
    'Screen recording'?: string;
    Analysis?: string;
    'Question Ask by Client'?: string;
    'AI Generated Question'?: string;
    linkedin_profile_url?: string;
    applied_via_linkedin?: boolean;
    source_linkedin?: boolean;
    jobs?: {
        title: string;
    };
}

const Candidates = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [filterSource] = useState<string>("all");
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [cvViewerCandidate, setCvViewerCandidate] = useState<Candidate | null>(null);
    const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone: "",
        interview_status: "",
        ai_score: "",
        notes: "",
    });

    const tableFilter = searchParams.get('table');

    useEffect(() => {
        fetchCandidates();
    }, [tableFilter]);

    useEffect(() => {
        if (editCandidate) {
            setEditForm({
                name: editCandidate.name || "",
                email: editCandidate.email || "",
                phone: editCandidate.phone || "",
                interview_status: editCandidate.interview_status || "",
                ai_score: getScore(editCandidate)?.toString() || "",
                notes: editCandidate.Analysis || "",
            });
        }
    }, [editCandidate]);

    useEffect(() => {
        let filtered = candidates;

        if (filterSource !== "all") {
            filtered = filtered.filter((c) => c.source === filterSource);
        }

        if (searchQuery) {
            filtered = filtered.filter(
                (c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.jobs?.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredCandidates(filtered);
    }, [searchQuery, candidates, filterSource]);

    const fetchCandidates = async () => {
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) {
                navigate("/login");
                return;
            }

            setLoading(true);

            // Fetch candidates along with related job data
            const { data, error } = await supabase
                .from("Applicant")
                .select(`
                    *,
                    jobs:job_id (
                        title
                    )
                `)
                .eq("user_id", auth.user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const loaded = (data || []).map(c => ({
                ...c,
                source: "Applicant" as const,
                stage_priority: 2
            }));

            setCandidates(loaded);
        } catch (error: any) {
            console.error("Fetch error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to fetch candidates",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleMeeting = (candidate: Candidate) => {
        setSelectedCandidate(candidate);
        setScheduleDialogOpen(true);
    };

    const getInterviewStatusBadge = (status?: string) => {
        if (!status) return <Badge variant="outline">Pending</Badge>;

        const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
            pending: "outline",
            scheduled: "secondary",
            completed: "default",
            passed: "default",
            failed: "destructive",
        };
        return <Badge variant={variants[status.toLowerCase()] || "outline"}>{status}</Badge>;
    };

    const getSourceBadge = (source: Candidate['source']) => {
        const sourceConfig = {
            'Applicant': { variant: 'outline' as const, label: 'Applicant', color: 'bg-blue-100 text-blue-800' },
            'Shortlisted': { variant: 'default' as const, label: 'Shortlisted', color: 'bg-purple-100 text-purple-800' },
            'Final Interview': { variant: 'secondary' as const, label: 'Final Interview', color: 'bg-green-100 text-green-800' },
            'Client': { variant: 'outline' as const, label: 'Imported', color: 'bg-gray-100 text-gray-800' }
        };

        const config = sourceConfig[source];
        return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
    };

    const getScore = (candidate: Candidate) => {
        if (candidate.Score != null) return candidate.Score;
        if (candidate.ai_score != null) return candidate.ai_score;
        return null;
    };

    const getPageTitle = () => {
        if (tableFilter === 'qualified') return 'Qualified for Final Interview';
        if (tableFilter === 'shortlisted') return 'Shortlisted Candidates';
        return 'All Candidates';
    };

    const handleDownloadCV = (url: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMoveCandidate = async (candidate: Candidate, destination: "qualified" | "shortlisted") => {
        try {
            setActionLoadingId(candidate.id);
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) {
                navigate("/login");
                return;
            }

            const payload = {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone || null,
                ai_score: getScore(candidate),
                cv_file_url: candidate.cv_file_url || null,
                job_id: candidate.job_id || null,
                user_id: auth.user.id,
                interview_status: candidate.interview_status || null,
                interview_date: candidate.interview_date || null,
                interview_result: candidate.interview_result || null,
                status: candidate.source,
                notes: candidate.Analysis || null,
                updated_at: new Date().toISOString(),
            };

            const tableName = destination === "qualified" ? "Qualified_For_Final_Interview" : "Shortlisted_candidates";
            const { error } = await supabase.from(tableName as any).upsert(payload);

            if (error) throw error;

            const newSource = destination === "qualified" ? "Final Interview" : "Shortlisted";

            setCandidates((prev) =>
                prev.map((c) =>
                    c.id === candidate.id
                        ? {
                            ...c,
                            source: newSource as Candidate['source'],
                        }
                        : c
                )
            );

            toast({
                title: "Candidate updated",
                description: `Moved to ${destination === "qualified" ? "Initial Interview Qualified" : "Shortlisted"} stage.`,
            });
        } catch (error: any) {
            console.error("Move candidate error:", error);
            toast({
                title: "Error",
                description: error.message || "Unable to move candidate",
                variant: "destructive",
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleEditSubmit = async () => {
        if (!editCandidate) return;

        try {
            setEditLoading(true);
            const updates: any = {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                phone: editForm.phone.trim() || null,
                interview_status: editForm.interview_status.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (editForm.ai_score) {
                const parsed = Number(editForm.ai_score);
                updates.ai_score = Number.isNaN(parsed) ? null : parsed;
            } else {
                updates.ai_score = null;
            }

            if (editForm.notes) {
                updates.notes = editForm.notes;
            }

            const { error } = await supabase.from("Applicant").update(updates).eq("id", editCandidate.id);
            if (error) throw error;

            setCandidates((prev) =>
                prev.map((candidate) =>
                    candidate.id === editCandidate.id
                        ? {
                            ...candidate,
                            ...updates,
                            ai_score: updates.ai_score ?? candidate.ai_score,
                            interview_status: updates.interview_status,
                        }
                        : candidate
                )
            );

            toast({
                title: "Candidate updated",
                description: "Details saved successfully.",
            });

            setEditCandidate(null);
        } catch (error: any) {
            console.error("Edit candidate error:", error);
            toast({
                title: "Error",
                description: error.message || "Unable to update candidate",
                variant: "destructive",
            });
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteCandidateConfirm = async () => {
        if (!deleteCandidate) return;

        try {
            setActionLoadingId(deleteCandidate.id);
            const { error } = await supabase.from("Applicant").delete().eq("id", deleteCandidate.id);
            if (error) throw error;

            setCandidates((prev) => prev.filter((candidate) => candidate.id !== deleteCandidate.id));
            toast({
                title: "Candidate removed",
                description: `${deleteCandidate.name} has been deleted`,
            });
            setDeleteCandidate(null);
        } catch (error: any) {
            console.error("Delete candidate error:", error);
            toast({
                title: "Error",
                description: error.message || "Unable to delete candidate",
                variant: "destructive",
            });
        } finally {
            setActionLoadingId(null);
        }
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

                        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{getPageTitle()}</h1>
                            <p className="text-muted-foreground">
                                Total: {filteredCandidates.length} candidates
                            </p>
                        </div>
                        {tableFilter && (
                            <Button variant="outline" onClick={() => navigate('/candidates')}>
                                View All Candidates
                            </Button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or job title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Candidate List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">Loading candidates...</p>
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No candidates found
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Job</TableHead>
                                                <TableHead>Stage</TableHead>
                                                <TableHead>Interview</TableHead>
                                                <TableHead>Score</TableHead>
                                                <TableHead>Applied</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {filteredCandidates.map((candidate) => (
                                                <TableRow key={candidate.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            {candidate.name}
                                                            {candidate.linkedin_profile_url && (
                                                                <a
                                                                    href={candidate.linkedin_profile_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-600 hover:underline"
                                                                >
                                                                    LinkedIn
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>{candidate.email}</TableCell>
                                                    <TableCell>{candidate.phone || "N/A"}</TableCell>
                                                    <TableCell>{candidate.jobs?.title || "N/A"}</TableCell>

                                                    <TableCell>{getSourceBadge(candidate.source)}</TableCell>

                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            {getInterviewStatusBadge(candidate.interview_status)}
                                                            {candidate.interview_date && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(candidate.interview_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {getScore(candidate) !== null ? (
                                                            <Badge variant="secondary">{getScore(candidate)}%</Badge>
                                                        ) : (
                                                            "N/A"
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {new Date(candidate.created_at).toLocaleDateString()}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {candidate.source !== 'Shortlisted' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScheduleMeeting(candidate)}
                                                                >
                                                                    <Calendar className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {candidate['Recording URL'] && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => window.open(candidate['Recording URL'], "_blank")}
                                                                >
                                                                    📹
                                                                </Button>
                                                            )}

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-64">
                                                                    <DropdownMenuLabel>Manage Candidate</DropdownMenuLabel>
                                                                    {candidate.cv_file_url ? (
                                                                        <DropdownMenuItem onClick={() => setCvViewerCandidate(candidate)}>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View CV
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem disabled>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            No CV Uploaded
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleMoveCandidate(candidate, "qualified")}
                                                                        disabled={actionLoadingId === candidate.id}
                                                                    >
                                                                        <MoveRight className="mr-2 h-4 w-4" />
                                                                        Move to Initial Interview Qualified
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleMoveCandidate(candidate, "shortlisted")}
                                                                        disabled={actionLoadingId === candidate.id || candidate.source === "Shortlisted"}
                                                                    >
                                                                        <MoveRight className="mr-2 h-4 w-4 rotate-180" />
                                                                        Move to Shortlisted
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => setEditCandidate(candidate)}>
                                                                        <PenSquare className="mr-2 h-4 w-4" />
                                                                        Edit Candidate
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => setDeleteCandidate(candidate)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete Candidate
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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
                </div>
            </main>

            {selectedCandidate && (
                <ScheduleMeetingDialog
                    candidate={selectedCandidate}
                    open={scheduleDialogOpen}
                    onOpenChange={setScheduleDialogOpen}
                    onSuccess={fetchCandidates}
                />
            )}

            <Dialog open={!!cvViewerCandidate} onOpenChange={(open) => !open && setCvViewerCandidate(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Candidate CV</DialogTitle>
                        <DialogDescription>
                            {cvViewerCandidate?.name} &middot; {cvViewerCandidate?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {cvViewerCandidate?.cv_file_url ? (
                            <div className="h-[500px] rounded-md border">
                                <iframe
                                    src={cvViewerCandidate.cv_file_url}
                                    title="Candidate CV"
                                    className="w-full h-full rounded-md"
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No CV uploaded for this candidate.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCvViewerCandidate(null)}>
                            Close
                        </Button>
                        {cvViewerCandidate?.cv_file_url && (
                            <Button onClick={() => handleDownloadCV(cvViewerCandidate.cv_file_url!)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download CV
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editCandidate} onOpenChange={(open) => !open && setEditCandidate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Candidate</DialogTitle>
                        <DialogDescription>Update the candidate information and save changes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                                id="edit-phone"
                                value={editForm.phone}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-status">Interview Status</Label>
                            <Input
                                id="edit-status"
                                value={editForm.interview_status}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, interview_status: e.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-score">AI Score</Label>
                            <Input
                                id="edit-score"
                                value={editForm.ai_score}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, ai_score: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                rows={4}
                                value={editForm.notes}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCandidate(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit} disabled={editLoading}>
                            {editLoading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete candidate</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently remove{" "}
                            <span className="font-semibold">{deleteCandidate?.name}</span> from your candidates list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCandidateConfirm}
                            disabled={actionLoadingId === deleteCandidate?.id}
                        >
                            {actionLoadingId === deleteCandidate?.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Candidates;
