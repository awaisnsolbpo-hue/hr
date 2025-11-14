import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowLeft, Users, CheckCircle, Loader2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalCandidates: number;
  shortlisted: number;
  qualified: number;
  successRate: number;
  conversionRate: number;
}

const SuccessRatePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalCandidates: 0,
    shortlisted: 0,
    qualified: 0,
    successRate: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: applicants } = await supabase
        .from("Applicant")
        .select("email")
        .eq("user_id", user.id);

      const { count: shortlistedCount } = await supabase
        .from("Shortlisted_candidates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: qualifiedCount } = await supabase
        .from("Qualified_For_Final_Interview")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const totalCandidates = applicants?.length || 0;
      const shortlisted = shortlistedCount || 0;
      const qualified = qualifiedCount || 0;

      const successRate =
        totalCandidates > 0 ? Math.round((shortlisted / totalCandidates) * 100) : 0;

      const conversionRate =
        totalCandidates > 0 ? Math.round((qualified / totalCandidates) * 100) : 0;

      setStats({
        totalCandidates,
        shortlisted,
        qualified,
        successRate,
        conversionRate,
      });

      console.log('📊 Success Stats Loaded:', {
        totalCandidates,
        shortlisted,
        qualified,
        successRate,
        conversionRate,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Success Rate</h1>
                  <p className="text-sm text-muted-foreground">
                    {stats.successRate}% success rate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">{stats.totalCandidates}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Shortlisted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold">{stats.shortlisted}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-500" />
                <span className="text-3xl font-bold">{stats.successRate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <span className="text-3xl font-bold">{stats.conversionRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Hiring Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Total Candidates</span>
                <span className="text-sm font-semibold">{stats.totalCandidates}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Qualified for Interview</span>
                <span className="text-sm font-semibold">{stats.qualified}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: stats.totalCandidates > 0 
                      ? `${(stats.qualified / stats.totalCandidates) * 100}%`
                      : "0%",
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Shortlisted</span>
                <span className="text-sm font-semibold">{stats.shortlisted}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: stats.totalCandidates > 0
                      ? `${(stats.shortlisted / stats.totalCandidates) * 100}%`
                      : "0%",
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuccessRatePage;