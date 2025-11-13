import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Clock, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScheduledMeeting {
    id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_phone?: string;
    meeting_date: string;
    meeting_duration: number;
    meeting_status: string;
    zoom_link?: string;
    meeting_password?: string;
    meeting_instructions?: string;
    ai_score?: number;
    cv_file_url?: string;
    created_at: string;
    job_id?: string;
    jobs?: {
        title: string;
    } | null;
}

const ScheduledMeetingsCard = () => {
    const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUpcomingMeetings();

        // Set up real-time subscription
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const subscription = supabase
                    .channel('meetings-dashboard')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'scheduled_meetings',
                            filter: `user_id=eq.${user.id}`
                        },
                        () => {
                            fetchUpcomingMeetings();
                        }
                    )
                    .subscribe();

                return () => {
                    subscription.unsubscribe();
                };
            }
        };

        setupSubscription();
    }, []);

    const fetchUpcomingMeetings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date();
            const nextWeek = new Date(now);
            nextWeek.setDate(now.getDate() + 7);

            // Fetch upcoming meetings (next 7 days)
            const { data: meetingsData, error } = await supabase
                .from("scheduled_meetings")
                .select(`
                    id,
                    candidate_name,
                    candidate_email,
                    candidate_phone,
                    meeting_date,
                    meeting_duration,
                    meeting_status,
                    zoom_link,
                    meeting_password,
                    meeting_instructions,
                    ai_score,
                    cv_file_url,
                    created_at,
                    job_id,
                    jobs (
                        title
                    )
                `)
                .eq("user_id", user.id)
                .gte("meeting_date", now.toISOString())
                .lte("meeting_date", nextWeek.toISOString())
                .not("meeting_status", "in", '("completed","cancelled")')
                .order("meeting_date", { ascending: true })
                .limit(3);

            if (error) throw error;

            setMeetings((meetingsData as ScheduledMeeting[]) || []);
        } catch (error) {
            console.error("Error fetching meetings:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        if (isToday) return `Today, ${timeStr}`;
        if (isTomorrow) return `Tomorrow, ${timeStr}`;

        return `${dateStr}, ${timeStr}`;
    };

    const getTimeUntil = (dateString: string) => {
        const now = new Date();
        const meetingDate = new Date(dateString);
        const diffMs = meetingDate.getTime() - now.getTime();

        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 60) return `In ${diffMins}m`;
        if (diffHours < 24) return `In ${diffHours}h`;

        const diffDays = Math.floor(diffHours / 24);
        return `In ${diffDays}d`;
    };

    if (loading) {
        return (
            <Card className="hover-glow transition-all">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Scheduled Meetings
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-24"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover-glow transition-all">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Scheduled Meetings
                    </CardTitle>
                    <Link to="/scheduled-meetings">
                        <Button variant="ghost" size="sm">
                            View All
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                    {meetings.length === 1 ? "1 upcoming" : `${meetings.length} upcoming`} in next 7 days
                </p>
            </CardHeader>
            <CardContent>
                {meetings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No upcoming meetings</p>
                        <p className="text-xs mt-1">Schedule meetings from the Candidates page</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {meetings.map((meeting) => (
                            <div
                                key={meeting.id}
                                className="p-4 border rounded-lg hover:shadow-md transition-all bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:from-blue-50 hover:to-purple-50"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="h-4 w-4 text-primary" />
                                            <h4 className="font-semibold text-base">
                                                {meeting.candidate_name}
                                            </h4>
                                            {meeting.ai_score && (
                                                <Badge variant="secondary" className="ml-auto">
                                                    {meeting.ai_score}% Score
                                                </Badge>
                                            )}
                                        </div>
                                        {meeting.jobs?.title && (
                                            <p className="text-sm text-muted-foreground">
                                                Position: {meeting.jobs.title}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="flex items-center gap-4 mb-3 text-sm">
                                    <div className="flex items-center gap-2 text-primary font-medium">
                                        <Calendar className="h-4 w-4" />
                                        {formatDateTime(meeting.meeting_date)}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {getTimeUntil(meeting.meeting_date)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        {meeting.meeting_duration || 30} min
                                    </div>
                                </div>

                                {/* Meeting ID */}
                                {meeting.zoom_link && (
                                    <div className="space-y-2 mb-3 p-3 bg-white/50 rounded border">
                                        <div className="flex items-center gap-2">
                                            <Video className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Meeting ID
                                            </span>
                                        </div>
                                        <p className="text-sm font-mono font-semibold text-primary">
                                            {meeting.zoom_link}
                                        </p>
                                    </div>
                                )}

                                {/* Instructions */}
                                {meeting.meeting_instructions && (
                                    <div className="mb-3 p-2 bg-muted rounded text-xs">
                                        <p className="font-medium mb-1">Instructions:</p>
                                        <p className="text-muted-foreground">{meeting.meeting_instructions}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Link to="/scheduled-meetings" className="flex-1">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <Video className="h-4 w-4 mr-2" />
                                            View Meeting Details
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {meetings.length > 0 && (
                    <Link to="/scheduled-meetings">
                        <Button variant="outline" size="sm" className="w-full mt-4">
                            View All Meetings ({meetings.length})
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
};

export default ScheduledMeetingsCard;