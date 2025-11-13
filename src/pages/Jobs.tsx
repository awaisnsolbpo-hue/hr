import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  LogOut,
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  Users,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  description?: string;
  city?: string;
  country?: string;
  status: string;
  created_at: string;
  user_id: string;
  applications?: number;
}

const Jobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No logged-in user:", userError);
        navigate("/login");
        return;
      }

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      // For each job, count applications from Applicant table
      const jobsWithCount = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from("Applicant")
            .select("*", { count: "exact", head: true })
            .eq("job_id", job.id);

          return {
            ...job,
            applications: count || 0,
          };
        })
      );

      setJobs(jobsWithCount);
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

  const handleShareJob = (jobId: string) => {
    const shareUrl = `${window.location.origin}/jobs/public/${jobId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied!",
      description: "Job link copied to clipboard. Share it with candidates!",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      active: { variant: "default", label: "Active" },
      paused: { variant: "secondary", label: "Paused" },
      draft: { variant: "outline", label: "Draft" },
      deleted: { variant: "destructive", label: "Deleted" },
      closed: { variant: "secondary", label: "Closed" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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

            <Button
              variant="ghost"
              size="default"
              onClick={() => navigate("/dashboard")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Jobs Overview</h1>
              <p className="text-muted-foreground">
                Manage your job postings and track applications
              </p>
            </div>
            <Link to="/create-job">
              <Button variant="default" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create New Job
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title or keyword..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter: {filterStatus === "all" ? "All Jobs" : filterStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  All Jobs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                  Active Jobs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("draft")}>
                  Draft Jobs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("paused")}>
                  Paused Jobs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("closed")}>
                  Closed Jobs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Jobs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No jobs found
              </div>
            ) : (
              filteredJobs.map((job, index) => (
                <Card
                  key={job.id}
                  className="hover-scale hover-glow cursor-pointer transition-all animate-fade-in-up h-full"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Link to={`/jobs/${job.id}`} className="flex-1">
                        <CardTitle className="text-lg hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
                      </Link>
                      {getStatusBadge(job.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Created: {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {job.city && job.country && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {job.city}, {job.country}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{job.applications} Applications</span>
                      </div>
                    </div>

                    {/* Share Button */}
                    {job.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          handleShareJob(job.id);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Job Link
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Jobs;