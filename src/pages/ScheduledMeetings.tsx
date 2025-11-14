import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Calendar,
    Clock,
    Video,
    Mail,
    User,
    Search,
    ArrowLeft,
    ExternalLink,
    FileText,
    Phone,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScheduledMeeting {
    id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string | null;
    job_id: string | null;
    job_title: string | null;
    meeting_date: string;
    meeting_duration: number;
    meeting_link: string;
    meeting_status: string | null;
    instructions: string | null;
    ai_score: number | null;
    cv_file_url: string | null;
    created_at: string;
    user_id: string;
}

export default function ScheduledMeetings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/login");
            return;
        }
        setUser(session.user);
        fetchScheduledMeetings(session.user.id);
    };

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel('meetings-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scheduled_meetings',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    console.log('📊 Real-time update detected, refreshing meetings...');
                    fetchScheduledMeetings(user.id);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const fetchScheduledMeetings = async (userId: string) => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("scheduled_meetings")
                .select("*")
                .eq("user_id", userId)
                .order("meeting_date", { ascending: true });

            if (error) {
                console.error("Supabase error:", error);
                throw error;
            }

            console.log('📊 Scheduled Meetings Loaded:', data?.length || 0);
            setMeetings(data || []);
        } catch (error) {
            console.error("Error fetching scheduled meetings:", error);
            toast({
                title: "Error",
                description: "Failed to load meetings",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getFilteredMeetings = () => {
        const now = new Date();

        let filtered = meetings;

        // Apply date filter
        if (filter === "upcoming") {
            filtered = filtered.filter((meeting) => {
                const meetingDateTime = new Date(meeting.meeting_date);
                const status = meeting.meeting_status?.toLowerCase();
                return meetingDateTime >= now && status !== 'completed' && status !== 'cancelled';
            });
        } else if (filter === "past") {
            filtered = filtered.filter((meeting) => {
                const meetingDateTime = new Date(meeting.meeting_date);
                const status = meeting.meeting_status?.toLowerCase();
                return meetingDateTime < now || status === 'completed' || status === 'cancelled';
            });
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (meeting) =>
                    meeting.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    meeting.candidate_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    meeting.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    };

    const getTimeUntilMeeting = (dateString: string) => {
        const meetingDateTime = new Date(dateString);
        const now = new Date();
        const diffMs = meetingDateTime.getTime() - now.getTime();

        if (diffMs < 0) {
            return formatDistanceToNow(meetingDateTime, { addSuffix: true });
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours < 1) {
            return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
        } else if (diffHours < 24) {
            return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(diffHours / 24);
            return `in ${days} day${days > 1 ? 's' : ''}`;
        }
    };

    const isUpcoming = (dateString: string) => {
        const meetingDateTime = new Date(dateString);
        const now = new Date();
        return meetingDateTime > now;
    };

    const getStatusBadge = (status: string | null) => {
        const statusLower = status?.toLowerCase() || "scheduled";

        const statusConfig: Record<string, { label: string; className: string }> = {
            scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200" },
            pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
            completed: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
            cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
            confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
        };

        const config = statusConfig[statusLower] || statusConfig.scheduled;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const filteredMeetings = getFilteredMeetings();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Scheduled Meetings</h1>
                            <p className="text-gray-600 mt-1">Manage all your interview meetings</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                        {filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? "s" : ""}
                    </Badge>
                </div>

                {/* Filters and Search */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search by name, email, or job title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant={filter === "upcoming" ? "default" : "outline"}
                                    onClick={() => setFilter("upcoming")}
                                    size="sm"
                                >
                                    Upcoming
                                </Button>
                                <Button
                                    variant={filter === "past" ? "default" : "outline"}
                                    onClick={() => setFilter("past")}
                                    size="sm"
                                >
                                    Past
                                </Button>
                                <Button
                                    variant={filter === "all" ? "default" : "outline"}
                                    onClick={() => setFilter("all")}
                                    size="sm"
                                >
                                    All
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Meetings List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Meetings Found</h3>
                            <p className="text-gray-500">
                                {searchTerm
                                    ? "Try adjusting your search terms"
                                    : filter === "upcoming"
                                        ? "No upcoming meetings scheduled"
                                        : filter === "past"
                                            ? "No past meetings found"
                                            : "Schedule your first meeting from the Candidates page"}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredMeetings.map((meeting) => {
                            const upcoming = isUpcoming(meeting.meeting_date);
                            const meetingDateTime = new Date(meeting.meeting_date);

                            return (
                                <Card
                                    key={meeting.id}
                                    className={`transition-all hover:shadow-lg ${upcoming ? "border-l-4 border-l-blue-500" : "opacity-75"
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            {/* Left Section - Candidate Info */}
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            <User className="h-5 w-5 text-blue-600" />
                                                            <h3 className="text-xl font-bold text-gray-900">
                                                                {meeting.candidate_name}
                                                            </h3>
                                                            {getStatusBadge(meeting.meeting_status)}
                                                            {meeting.ai_score && (
                                                                <Badge
                                                                    variant={
                                                                        meeting.ai_score >= 80
                                                                            ? "default"
                                                                            : meeting.ai_score >= 60
                                                                                ? "secondary"
                                                                                : "outline"
                                                                    }
                                                                >
                                                                    AI Score: {meeting.ai_score}%
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <Mail className="h-4 w-4" />
                                                                <a 
                                                                    href={`mailto:${meeting.candidate_email}`}
                                                                    className="hover:text-blue-600 hover:underline"
                                                                >
                                                                    {meeting.candidate_email}
                                                                </a>
                                                            </div>
                                                            {meeting.candidate_phone && (
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <Phone className="h-4 w-4" />
                                                                    <a 
                                                                        href={`tel:${meeting.candidate_phone}`}
                                                                        className="hover:text-blue-600 hover:underline"
                                                                    >
                                                                        {meeting.candidate_phone}
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {meeting.job_title && (
                                                                <div className="text-sm text-gray-500">
                                                                    Position: <span className="font-medium">{meeting.job_title}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {upcoming && (
                                                        <Badge className="bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
                                                            {getTimeUntilMeeting(meeting.meeting_date)}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Meeting Details */}
                                                <div className="grid md:grid-cols-2 gap-3">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Calendar className="h-4 w-4 text-blue-600" />
                                                        <span className="font-medium">
                                                            {format(meetingDateTime, "EEEE, MMMM d, yyyy")}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Clock className="h-4 w-4 text-blue-600" />
                                                        <span className="font-medium">
                                                            {format(meetingDateTime, "h:mm a")} ({meeting.meeting_duration} mins)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Instructions */}
                                                {meeting.instructions && (
                                                    <div className="bg-gray-50 p-4 rounded-lg">
                                                        <div className="flex items-start gap-2">
                                                            <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
                                                                <p className="text-sm text-gray-600">{meeting.instructions}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Section - Meeting Link */}
                                            <div className="lg:w-64 space-y-3">
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                                                    <div className="flex items-center gap-2 text-blue-900 font-semibold">
                                                        <Video className="h-5 w-5" />
                                                        <span>Meeting Link</span>
                                                    </div>

                                                    {meeting.meeting_link && (
                                                        <a
                                                            href={meeting.meeting_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <Button className="w-full gap-2" size="sm">
                                                                Join Meeting
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        </a>
                                                    )}

                                                    {meeting.cv_file_url && (
                                                        <a
                                                            href={meeting.cv_file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <Button variant="outline" className="w-full gap-2" size="sm">
                                                                <FileText className="h-3 w-3" />
                                                                View CV
                                                            </Button>
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="text-xs text-gray-500 text-center">
                                                    Scheduled on {format(new Date(meeting.created_at), "MMM d, yyyy")}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}