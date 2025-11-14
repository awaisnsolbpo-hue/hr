import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sparkles,
    LogOut,
    UserPlus,
    Briefcase,
    Users,
    MessageSquare,
    Calendar,
    CheckCircle,
    TrendingUp,
    Clock,
    ArrowRight,
    Star,
    Moon,
    Sun,
    User,
    Settings,
    Building2,
    Search,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface RecentActivity {
    id: string;
    type: 'candidate_added' | 'interview_completed' | 'candidate_shortlisted' | 'job_posted';
    message: string;
    timestamp: string;
    candidateName?: string;
    jobTitle?: string;
}

interface UpcomingMeeting {
    id: string;
    candidate_name: string;
    candidate_email: string;
    job_title: string | null;
    meeting_date: string;
    meeting_duration: number;
    meeting_link: string;
    ai_score: number | null;
}

interface Profile {
    id: string;
    full_name: string;
    email: string;
    company_name: string | null;
    company_logo_url: string | null;
    is_company_profile_complete: boolean;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [referralLink] = useState("https://aihiring.com/ref/abc123");
    const [metrics, setMetrics] = useState({
        activeJobs: 0,
        linkedInJobs: 0,
        totalCandidates: 0,
        initialInterviewQualified: 0,
        scheduledInterviews: 0,
        shortlistedCandidates: 0,
        successRate: 0,
    });
    const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const deduplicateCandidatesByEmail = (candidates: any[]): any[] => {
        const candidateMap = new Map<string, any>();

        candidates.forEach(candidate => {
            const email = candidate.email?.toLowerCase();
            if (!email) return;

            const existing = candidateMap.get(email);

            const getPriority = (source: string) => {
                const priorities: Record<string, number> = {
                    'Client': 1,
                    'Applicant': 2,
                    'Final Interview': 3,
                    'Shortlisted': 4
                };
                return priorities[source] || 0;
            };

            if (!existing || getPriority(candidate.source) > getPriority(existing.source)) {
                candidateMap.set(email, candidate);
            }
        });

        return Array.from(candidateMap.values());
    };

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                navigate("/login", { replace: true });
                return;
            }

            setUser(session.user);
            fetchProfile(session.user.id);
            fetchMetrics(session.user.id);
            fetchRecentActivities(session.user.id);
            fetchUpcomingMeetings(session.user.id);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    navigate("/login", { replace: true });
                } else if (event === 'SIGNED_IN' && session) {
                    setUser(session.user);
                    fetchProfile(session.user.id);
                    fetchMetrics(session.user.id);
                    fetchRecentActivities(session.user.id);
                    fetchUpcomingMeetings(session.user.id);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, company_name, company_logo_url, is_company_profile_complete")
                .eq("id", userId)
                .single();

            if (error) throw error;
            setProfile(data);

            if (data && !data.is_company_profile_complete) {
                toast({
                    title: "Complete Your Company Profile",
                    description: "Add company details to make your job postings more attractive!",
                    action: (
                        <Button size="sm" onClick={() => navigate("/profile")}>
                            Complete Now
                        </Button>
                    ),
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    useEffect(() => {
        if (!user) return;

        const clientSubscription = supabase
            .channel('client-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Client', filter: `user_id=eq.${user.id}` }, () => {
                fetchMetrics(user.id);
                fetchRecentActivities(user.id);
            })
            .subscribe();

        const applicantsSubscription = supabase
            .channel('applicants-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Applicant', filter: `user_id=eq.${user.id}` }, () => {
                fetchMetrics(user.id);
                fetchRecentActivities(user.id);
            })
            .subscribe();

        const jobsSubscription = supabase
            .channel('jobs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `user_id=eq.${user.id}` }, () => {
                fetchMetrics(user.id);
                fetchRecentActivities(user.id);
            })
            .subscribe();

        const meetingsSubscription = supabase
            .channel('meetings-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_meetings', filter: `user_id=eq.${user.id}` }, () => {
                fetchMetrics(user.id);
                fetchUpcomingMeetings(user.id);
            })
            .subscribe();

        const shortlistedSubscription = supabase
            .channel('shortlisted-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Shortlisted_candidates', filter: `user_id=eq.${user.id}` }, () => {
                fetchMetrics(user.id);
                fetchRecentActivities(user.id);
            })
            .subscribe();

        return () => {
            clientSubscription.unsubscribe();
            applicantsSubscription.unsubscribe();
            jobsSubscription.unsubscribe();
            meetingsSubscription.unsubscribe();
            shortlistedSubscription.unsubscribe();
        };
    }, [user]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
            });
        } catch (error: any) {
            toast({
                title: "Logout Failed",
                description: error.message || "An error occurred during logout.",
                variant: "destructive",
            });
            setLoggingOut(false);
        }
    };

    const fetchUpcomingMeetings = async (userId: string) => {
        try {
            const now = new Date();
            const nextWeek = new Date(now);
            nextWeek.setDate(now.getDate() + 7);

            const { data, error } = await supabase
                .from("scheduled_meetings")
                .select("*")
                .eq("user_id", userId)
                .gte("meeting_date", now.toISOString())
                .lte("meeting_date", nextWeek.toISOString())
                .order("meeting_date", { ascending: true })
                .limit(3);

            if (error) throw error;

            const filtered = (data || []).filter(meeting => {
                const status = meeting.meeting_status?.toLowerCase();
                return status !== 'completed' && status !== 'cancelled';
            });

            setUpcomingMeetings(filtered);
        } catch (error) {
            console.error("Error fetching upcoming meetings:", error);
        }
    };

    const fetchMetrics = async (userId: string) => {
        try {
            console.log('🔄 Fetching metrics for user:', userId);

            // 1. COUNT ACTIVE JOBS
            const { count: jobsCount } = await supabase
                .from("jobs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("status", "active");
            console.log('📊 Active Jobs:', jobsCount);

            // 2. COUNT LINKEDIN JOBS
            const { count: linkedInJobsCount } = await supabase
                .from("jobs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .not("linkedin_post_id", "is", null);
            console.log('📊 LinkedIn Jobs:', linkedInJobsCount);

            // 3. COUNT TOTAL UNIQUE CANDIDATES (from Applicant table only)
            const { data: applicantData } = await supabase
                .from("Applicant")
                .select("email, created_at")
                .eq("user_id", userId);
            console.log('📊 Applicants:', applicantData?.length || 0);

            const candidatesCount = applicantData?.length || 0;

            // 4. COUNT INITIAL INTERVIEW QUALIFIED
            const { count: qualifiedCount } = await supabase
                .from("Qualified_For_Final_Interview")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId);
            console.log('📊 Qualified for Interview:', qualifiedCount);

            // 5. COUNT SCHEDULED INTERVIEWS (upcoming only)
            const now = new Date();
            const { data: upcomingMeetingsData } = await supabase
                .from("scheduled_meetings")
                .select("*")
                .eq("user_id", userId)
                .gte("meeting_date", now.toISOString());

            const scheduledMeetingsCount = upcomingMeetingsData?.filter(meeting => {
                const status = meeting.meeting_status?.toLowerCase();
                return status !== 'completed' && status !== 'cancelled';
            }).length || 0;
            console.log('📊 Scheduled Meetings:', scheduledMeetingsCount);

            // 6. COUNT SHORTLISTED CANDIDATES
            const { count: shortlistedCount } = await supabase
                .from("Shortlisted_candidates")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId);
            console.log('📊 Shortlisted:', shortlistedCount);

            // 7. CALCULATE SUCCESS RATE
            const successRate =
                candidatesCount > 0 && shortlistedCount
                    ? Math.round((shortlistedCount / candidatesCount) * 100)
                    : 0;

            setMetrics({
                activeJobs: jobsCount || 0,
                linkedInJobs: linkedInJobsCount || 0,
                totalCandidates: candidatesCount,
                initialInterviewQualified: qualifiedCount || 0,
                scheduledInterviews: scheduledMeetingsCount,
                shortlistedCandidates: shortlistedCount || 0,
                successRate,
            });

            console.log('📊 FINAL METRICS:', {
                activeJobs: jobsCount || 0,
                totalCandidates: candidatesCount,
                qualified: qualifiedCount || 0,
                scheduled: scheduledMeetingsCount,
                shortlisted: shortlistedCount || 0,
                successRate: successRate + '%',
            });

        } catch (error) {
            console.error("Error fetching metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async (userId: string) => {
        try {
            const activities: RecentActivity[] = [];

            const { data: recentClients } = await supabase
                .from("Client")
                .select("id, name, created_at, job_id, jobs(title)")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(3);

            if (recentClients) {
                recentClients.forEach((client: any) => {
                    activities.push({
                        id: `client-${client.id}`,
                        type: 'candidate_added',
                        message: `${client.name} added to ${client.jobs?.title || 'a position'}`,
                        timestamp: client.created_at,
                        candidateName: client.name,
                        jobTitle: client.jobs?.title,
                    });
                });
            }

            const { data: shortlisted } = await supabase
                .from("Shortlisted_candidates")
                .select("id, name, created_at, job_id, jobs(title)")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(2);

            if (shortlisted) {
                shortlisted.forEach((candidate: any) => {
                    activities.push({
                        id: `shortlist-${candidate.id}`,
                        type: 'candidate_shortlisted',
                        message: `${candidate.name} shortlisted for ${candidate.jobs?.title || 'a position'}`,
                        timestamp: candidate.created_at,
                        candidateName: candidate.name,
                        jobTitle: candidate.jobs?.title,
                    });
                });
            }

            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRecentActivities(activities.slice(0, 5));
        } catch (error) {
            console.error("Error fetching recent activities:", error);
        }
    };

    const getActivityIcon = (type: RecentActivity['type']) => {
        switch (type) {
            case 'candidate_added':
                return { color: 'bg-blue-500', icon: UserPlus };
            case 'interview_completed':
                return { color: 'bg-green-500', icon: CheckCircle };
            case 'candidate_shortlisted':
                return { color: 'bg-purple-500', icon: Star };
            case 'job_posted':
                return { color: 'bg-orange-500', icon: Briefcase };
            default:
                return { color: 'bg-gray-500', icon: Users };
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const formatMeetingTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours < 1) return `in ${diffMins}m`;
        if (diffHours < 24) return `in ${diffHours}h`;
        const days = Math.floor(diffHours / 24);
        return `in ${days}d`;
    };

    const formatMeetingDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today, ${time}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow, ${time}`;
        } else {
            return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
        }
    };

    const handleCopyReferral = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "Link Copied!",
            description: "Referral link copied to clipboard.",
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const metricCards = [
        {
            title: "Active Jobs",
            value: loading ? "..." : metrics.activeJobs.toString(),
            subtitle: metrics.linkedInJobs > 0 ? `${metrics.linkedInJobs} on LinkedIn` : "No LinkedIn posts yet",
            icon: Briefcase,
            gradient: "from-blue-500 to-blue-600",
            link: "/dashboard/active-jobs",
        },
        {
            title: "Total Candidates",
            value: loading ? "..." : metrics.totalCandidates.toString(),
            subtitle: "Unique applicants",
            icon: Users,
            gradient: "from-green-500 to-green-600",
            link: "/dashboard/total-candidates",
        },
        {
            title: "Initial Interview Qualified",
            value: loading ? "..." : metrics.initialInterviewQualified.toString(),
            subtitle: "Qualified for final interview",
            icon: CheckCircle,
            gradient: "from-purple-500 to-purple-600",
            link: "/dashboard/qualified",
        },
        {
            title: "Scheduled Interviews",
            value: loading ? "..." : metrics.scheduledInterviews.toString(),
            subtitle: "Upcoming meetings",
            icon: Calendar,
            gradient: "from-orange-500 to-orange-600",
            link: "/dashboard/scheduled-interviews",
        },
        {
            title: "Shortlisted Candidates",
            value: loading ? "..." : metrics.shortlistedCandidates.toString(),
            subtitle: "Final interview stage",
            icon: MessageSquare,
            gradient: "from-pink-500 to-pink-600",
            link: "/dashboard/shortlisted",
        },
        {
            title: "Success Rate",
            value: loading ? "..." : `${metrics.successRate}%`,
            subtitle: `${metrics.shortlistedCandidates} of ${metrics.totalCandidates} candidates`,
            icon: TrendingUp,
            gradient: "from-teal-500 to-teal-600",
            link: "/dashboard/success-rate",
        },
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
            <header className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-sm transition-colors duration-300 ${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 shadow-lg">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                AI Hiring
                            </span>
                        </Link>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            {profile?.company_logo_url ? (
                                                <AvatarImage src={profile.company_logo_url} alt={profile.company_name || "Company"} />
                                            ) : null}
                                            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                                                {profile?.company_name ? getInitials(profile.company_name) : user.email?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {!profile?.is_company_profile_complete && (
                                            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`} align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12">
                                                    {profile?.company_logo_url ? (
                                                        <AvatarImage src={profile.company_logo_url} />
                                                    ) : null}
                                                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                                                        {profile?.company_name ? getInitials(profile.company_name) : user.email?.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold leading-none truncate">
                                                        {profile?.full_name || user.email?.split('@')[0]}
                                                    </p>
                                                    {profile?.company_name && (
                                                        <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {profile.company_name}
                                                        </p>
                                                    )}
                                                    <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            {!profile?.is_company_profile_complete && (
                                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                                    Profile Incomplete
                                                </Badge>
                                            )}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className={darkMode ? 'bg-gray-700' : ''} />
                                    <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className={darkMode ? 'bg-gray-700' : ''} />
                                    <DropdownMenuItem onClick={handleLogout} disabled={loggingOut} className="cursor-pointer text-red-600 focus:text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{loggingOut ? "Logging out..." : "Log out"}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setDarkMode(!darkMode)}
                                className={`transition-all duration-300 ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:border-primary'}`}
                            >
                                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="default" className={`transition-colors ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:border-primary'}`}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Invite a Friend
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className={darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}>
                                    <DialogHeader>
                                        <DialogTitle className={darkMode ? 'text-white' : ''}>Invite a Friend</DialogTitle>
                                        <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
                                            Share your referral link and get rewards when they sign up!
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="flex gap-2">
                                            <Input value={referralLink} readOnly className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                                            <Button onClick={handleCopyReferral}>Copy</Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Welcome & Quick Actions Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Welcome Section & Quick Actions */}
                        <div className="space-y-6">
                            <div>
                                <h1 className={`text-4xl font-bold mb-2 transition-colors ${darkMode ? 'text-white' : 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent'}`}>
                                    Welcome back, {profile?.full_name || user.email?.split('@')[0]}! 👋
                                </h1>
                                <p className={`text-lg transition-colors ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {profile?.company_name ? `${profile.company_name} - ` : ''}Here's your real-time hiring activity overview
                                </p>
                            </div>

                            {/* Quick Actions - 4 CARDS */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Link to="/create-job" className="group">
                                    <Card className={`hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary cursor-pointer h-full relative overflow-hidden ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                        <CardContent className="p-6 text-center relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/50">
                                                <Briefcase className="h-6 w-6 text-white" />
                                            </div>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Job</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Post new position</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link to="/jobs" className="group">
                                    <Card className={`hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-500 cursor-pointer h-full relative overflow-hidden ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                        <CardContent className="p-6 text-center relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg group-hover:shadow-2xl group-hover:shadow-green-500/50">
                                                <Users className="h-6 w-6 text-white" />
                                            </div>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>View Jobs</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage openings</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link to="/import-candidates" className="group">
                                    <Card className={`hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 cursor-pointer h-full relative overflow-hidden ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                        <CardContent className="p-6 text-center relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg group-hover:shadow-2xl group-hover:shadow-blue-500/50">
                                                <UserPlus className="h-6 w-6 text-white" />
                                            </div>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Import</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Add candidates</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                {/* NEW ADVANCED SEARCH CARD */}
                                <Link to="/advanced-search" className="group">
                                    <Card className={`hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 cursor-pointer h-full relative overflow-hidden ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                                        <CardContent className="p-6 text-center relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg group-hover:shadow-2xl group-hover:shadow-purple-500/50">
                                                <Search className="h-6 w-6 text-white" />
                                            </div>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Search</p>
                                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Find candidates</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        </div>

                        {/* Upcoming Meetings */}
                        <Card className={`shadow-lg border-2 transition-all duration-300 ${darkMode ? 'bg-gray-800 border-orange-900/50' : 'border-orange-100 bg-gradient-to-br from-white to-orange-50/20'}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                                            <Calendar className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Meetings</CardTitle>
                                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Next 7 days</p>
                                        </div>
                                    </div>
                                    <Badge className={`text-xs font-bold ${darkMode ? 'bg-orange-900 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{upcomingMeetings.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                                {upcomingMeetings.length > 0 ? (
                                    <>
                                        {upcomingMeetings.slice(0, 3).map((meeting) => (
                                            <div key={meeting.id} className={`p-3 rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in ${darkMode ? 'bg-gray-750 border-gray-700 hover:bg-gray-700' : 'bg-white border-orange-100'}`}>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{meeting.candidate_name}</p>
                                                        <p className={`text-xs truncate mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{meeting.job_title || 'Interview'}</p>
                                                    </div>
                                                    {meeting.ai_score && (
                                                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                            {meeting.ai_score}% AI
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className={`flex items-center justify-between mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                                    <div className={`flex items-center gap-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <Clock className="h-3 w-3" />
                                                        <span className="truncate">{formatMeetingDateTime(meeting.meeting_date)}</span>
                                                    </div>
                                                    <Badge className={`text-xs ${darkMode ? 'bg-green-900 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                        {formatMeetingTime(meeting.meeting_date)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {upcomingMeetings.length > 3 && (
                                            <Link to="/dashboard/scheduled-interviews">
                                                <Button variant="outline" size="sm" className={`w-full text-xs transition-colors ${darkMode ? 'border-orange-800 hover:bg-orange-900/20 hover:text-orange-400' : 'border-orange-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'}`}>
                                                    View All ({upcomingMeetings.length}) <ArrowRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-6">
                                        <Calendar className={`h-10 w-10 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No upcoming meetings</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {metricCards.map((metric, index) => (
                            <Link key={index} to={metric.link}>
                                <Card className={`group hover:shadow-xl transition-all duration-300 border-2 border-transparent cursor-pointer h-full relative overflow-hidden ${darkMode ? 'bg-gray-800 hover:border-gray-600' : 'hover:border-gray-200'}`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {metric.title}
                                        </CardTitle>
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                                            <metric.icon className="h-5 w-5 text-white" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{metric.value}</div>
                                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{metric.subtitle}</p>
                                        <div className={`mt-3 pt-3 border-t flex items-center text-xs group-hover:text-primary transition-colors ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                                            <span>View details</span>
                                            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <Card className={`shadow-lg border-2 transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-100'}`}>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                                        <Clock className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</CardTitle>
                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Latest updates from your hiring pipeline</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className={`text-xs font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Live</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                            <div className={`w-10 h-10 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                                            <div className="flex-1 space-y-2">
                                                <div className={`h-4 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                                                <div className={`h-3 rounded w-1/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : recentActivities.length > 0 ? (
                                <div className="space-y-3">
                                    {recentActivities.map((activity) => {
                                        const { color, icon: ActivityIcon } = getActivityIcon(activity.type);
                                        return (
                                            <div key={activity.id} className={`flex items-start gap-4 group p-3 rounded-xl transition-all duration-300 animate-fade-in ${darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                                                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                                                    <ActivityIcon className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activity.message}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className={`text-xs ${darkMode ? 'border-gray-600' : ''}`}>{formatTimeAgo(activity.timestamp)}</Badge>
                                                        {activity.jobTitle && (
                                                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>• {activity.jobTitle}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        <Users className={`h-8 w-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                    </div>
                                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No recent activity</p>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Start by creating a job or importing candidates</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                
                .dark {
                    color-scheme: dark;
                }
                
                .bg-gray-750 {
                    background-color: #2d3748;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;