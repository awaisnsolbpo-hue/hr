import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  ArrowLeft,
  Search,
  Filter,
  Clock,
  Briefcase,
  Users,
  User,
  Settings,
  Calendar,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, format, parseISO, isToday, isYesterday, startOfDay } from "date-fns";

interface ActivityLog {
  id: string;
  created_at: string;
  actor_name: string;
  actor_email: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  description: string;
  category: string;
  severity: string;
  metadata: any;
}

interface GroupedActivities {
  [key: string]: ActivityLog[];
}

const ActivityLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, categoryFilter, severityFilter, dateFilter]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Fetch activity logs for this company
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("company_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error("Error loading activities:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.actor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.entity_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((activity) => activity.category === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((activity) => activity.severity === severityFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((activity) => {
        const activityDate = parseISO(activity.created_at);
        switch (dateFilter) {
          case "today":
            return isToday(activityDate);
          case "yesterday":
            return isYesterday(activityDate);
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return activityDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return activityDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredActivities(filtered);
  };

  const groupActivitiesByDate = (): GroupedActivities => {
    const grouped: GroupedActivities = {};

    filteredActivities.forEach((activity) => {
      const date = parseISO(activity.created_at);
      let dateKey: string;

      if (isToday(date)) {
        dateKey = "Today";
      } else if (isYesterday(date)) {
        dateKey = "Yesterday";
      } else {
        dateKey = format(date, "MMMM dd, yyyy");
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });

    return grouped;
  };

  const getActivityIcon = (action_type: string, category: string) => {
    switch (action_type) {
      case "created":
        return <FileText className="h-4 w-4" />;
      case "applied":
        return <Users className="h-4 w-4" />;
      case "qualified":
      case "hired":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "shortlisted":
        return <TrendingUp className="h-4 w-4" />;
      case "profile_updated":
        return <User className="h-4 w-4" />;
      case "status_changed":
      case "moved":
        return <RefreshCw className="h-4 w-4" />;
      default:
        if (category === "job_management") return <Briefcase className="h-4 w-4" />;
        if (category === "candidate_pipeline") return <Users className="h-4 w-4" />;
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "job_management":
        return <Briefcase className="h-4 w-4" />;
      case "candidate_pipeline":
        return <Users className="h-4 w-4" />;
      case "profile":
        return <User className="h-4 w-4" />;
      case "interviews":
        return <Calendar className="h-4 w-4" />;
      case "settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const exportActivities = () => {
    const csv = [
      ["Date", "Actor", "Action", "Description", "Category", "Entity"].join(","),
      ...filteredActivities.map((activity) =>
        [
          format(parseISO(activity.created_at), "yyyy-MM-dd HH:mm:ss"),
          activity.actor_name,
          activity.action_type,
          `"${activity.description}"`,
          activity.category,
          activity.entity_name,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success!",
      description: "Activity logs exported successfully",
    });
  };

  const handleActivityClick = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setIsDetailDialogOpen(true);
  };

  const groupedActivities = groupActivitiesByDate();

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

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
              <p className="text-muted-foreground">
                Complete history of all activities in your account
              </p>
            </div>
            <Button onClick={exportActivities} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Activities</p>
                    <p className="text-2xl font-bold">{activities.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">
                      {
                        activities.filter((a) => isToday(parseISO(a.created_at)))
                          .length
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Jobs Created</p>
                    <p className="text-2xl font-bold">
                      {
                        activities.filter(
                          (a) => a.entity_type === "job" && a.action_type === "created"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Candidates</p>
                    <p className="text-2xl font-bold">
                      {
                        activities.filter(
                          (a) => a.entity_type === "application" && a.action_type === "applied"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="job_management">Job Management</SelectItem>
                    <SelectItem value="candidate_pipeline">Candidate Pipeline</SelectItem>
                    <SelectItem value="interviews">Interviews</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || categoryFilter !== "all" || severityFilter !== "all" || dateFilter !== "all") && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredActivities.length} of {activities.length} activities
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setSeverityFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          {filteredActivities.length === 0 ? (
            <Card className="shadow-elegant">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Info className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No activities found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || categoryFilter !== "all" || severityFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Activities will appear here as actions are performed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-sm font-semibold text-muted-foreground px-3 py-1 bg-background rounded-full border">
                    {date}
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-3">
                  {dayActivities.map((activity) => (
                    <Card
                      key={activity.id}
                      className="shadow-elegant hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                              {getInitials(activity.actor_name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {activity.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {activity.actor_name || "System"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(parseISO(activity.created_at), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Time */}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(parseISO(activity.created_at), "h:mm a")}
                              </span>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-3">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getSeverityColor(activity.severity)}`}
                              >
                                <div className="flex items-center gap-1">
                                  {getActivityIcon(activity.action_type, activity.category)}
                                  <span className="capitalize">{activity.action_type}</span>
                                </div>
                              </Badge>

                              <Badge variant="outline" className="text-xs">
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(activity.category)}
                                  <span>
                                    {activity.category
                                      .split("_")
                                      .map(
                                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                                      )
                                      .join(" ")}
                                  </span>
                                </div>
                              </Badge>

                              {activity.entity_name && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.entity_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Activity Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                {selectedActivity && getActivityIcon(selectedActivity.action_type, selectedActivity.category)}
              </div>
              Activity Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this activity
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedActivity.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Actor</h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                          {getInitials(selectedActivity.actor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">{selectedActivity.actor_name || "System"}</p>
                        <p className="text-xs text-muted-foreground">{selectedActivity.actor_email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1">Timestamp</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selectedActivity.created_at), "PPpp")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({formatDistanceToNow(parseISO(selectedActivity.created_at), { addSuffix: true })})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Action Type</h4>
                    <Badge variant="outline" className={getSeverityColor(selectedActivity.severity)}>
                      <div className="flex items-center gap-1">
                        {getActivityIcon(selectedActivity.action_type, selectedActivity.category)}
                        <span className="capitalize">{selectedActivity.action_type}</span>
                      </div>
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1">Category</h4>
                    <Badge variant="outline">
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(selectedActivity.category)}
                        <span>
                          {selectedActivity.category
                            .split("_")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </span>
                      </div>
                    </Badge>
                  </div>
                </div>

                {selectedActivity.entity_name && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Entity</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedActivity.entity_type}</Badge>
                      <span className="text-sm text-muted-foreground">{selectedActivity.entity_name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Section */}
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Details
                  </h4>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {Object.entries(selectedActivity.metadata).map(([key, value]) => (
                          <div key={key} className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {key.replace(/_/g, " ")}
                            </span>
                            <div className="text-sm">
                              {typeof value === 'object' && value !== null ? (
                                <pre className="bg-background p-3 rounded-md overflow-x-auto text-xs font-mono border">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              ) : (
                                <span className="text-foreground">{String(value)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* IDs Section */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Activity ID</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{selectedActivity.id}</code>
                </div>
                {selectedActivity.entity_id && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Entity ID</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{selectedActivity.entity_id}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogs;