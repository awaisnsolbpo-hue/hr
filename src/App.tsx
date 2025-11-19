import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { navItems } from "./nav-items";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import EditJob from "./pages/Editjob";
import Candidates from "./pages/Candidates";
import ImportCandidates from "./pages/ImportCandidates";
import JobDetail from "./pages/JobDetail";
import PublicJobView from "./pages/PublicJobView";
import PublicUpload from "./pages/PublicUpload";
import GmailImport from "./pages/GmailImport";
import Interviews from "./pages/Interviews";
import ConnectLinkedin from "./pages/ConnectLinkedIn";
import { getLinkedInJobDetails } from "./lib/linkedinScraper";
import GmailCallback from "./pages/GmailCallback";
import LinkedinCallback from "./pages/LinkedInCallback";
import IntegrationsSettings from "./pages/IntegrationsSettings";
import ScheduledMeetings from "./pages/ScheduledMeetings";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ActivityLogs from "./pages/Activitylogs"
import CandidateSearch from "./pages/Candidatesearch";
import AdvancedSearch from "./pages/AdvancedSearch";
import InterviewLandingPage from "./pages/InterviewLandingPage";
import InterviewRoom from "./pages/InterviewRoom";
import NotFound from "./pages/NotFound";

// NEW: Dashboard Metric Pages
import ActiveJobsPage from "./pages/Activejobspage";
import TotalCandidatesPage from "@/pages/Totalcandidatespage";
import InitialInterviewQualifiedPage from "@/pages/Initialinterviewqualifiedpage";
import ScheduledInterviewsPage from "@/pages/Scheduledinterviewspage";
import ShortlistedCandidatesPage from "@/pages/Shortlistedcandidatespage";
import SuccessRatePage from "@/pages/Successratepage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ============================================
              PUBLIC ROUTES - No Authentication Required
          ============================================ */}
          
          {/* Landing & Auth Pages */}
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Public Job Application Routes - Candidates can view and apply */}
          <Route path="/jobs/public/:jobId" element={<PublicJobView />} />
          <Route path="/upload/:linkCode" element={<PublicUpload />} />
          
          {/* Public Interview Routes - Candidates access their interviews */}
          <Route path="/interview-landing" element={<InterviewLandingPage />} />
          <Route path="/interview-room" element={<InterviewRoom />} />
          
          {/* ============================================
              PROTECTED ROUTES - Authentication Required
          ============================================ */}
          
          {/* Dashboard & Profile */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/activity-logs" element={<ActivityLogs />} />
          
          {/* Dashboard Metric Pages - Detailed views of dashboard stats */}
          <Route path="/dashboard/active-jobs" element={<ActiveJobsPage />} />
          <Route path="/dashboard/total-candidates" element={<TotalCandidatesPage />} />
          <Route path="/dashboard/qualified" element={<InitialInterviewQualifiedPage />} />
          <Route path="/dashboard/scheduled-interviews" element={<ScheduledInterviewsPage />} />
          <Route path="/dashboard/shortlisted" element={<ShortlistedCandidatesPage />} />
          <Route path="/dashboard/success-rate" element={<SuccessRatePage />} />
          
          {/* ============================================
              JOB MANAGEMENT ROUTES
          ============================================ */}
          
          {/* Job List & Creation */}
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/create-job" element={<CreateJob />} />
          
          {/* Job View & Edit - :jobId is the job identifier */}
          <Route path="/jobs/:jobId" element={<JobDetail />} />
          <Route path="/edit-job/:jobId" element={<EditJob />} />
          
          {/* Legacy route support - redirects to new format */}
          <Route path="/job/:jobId" element={<JobDetail />} />
          
          {/* ============================================
              CANDIDATE MANAGEMENT ROUTES
          ============================================ */}
          
          {/* Candidate Views */}
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/import-candidates" element={<ImportCandidates />} />
          <Route path="/search-candidates" element={<CandidateSearch />} />
          <Route path="/advanced-search" element={<AdvancedSearch />} />
          
          {/* ============================================
              INTERVIEW MANAGEMENT ROUTES
          ============================================ */}
          
          {/* Interview Dashboard & Scheduling */}
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/scheduled-meetings" element={<ScheduledMeetings />} />
          
          {/* ============================================
              INTEGRATION ROUTES
          ============================================ */}
          
          {/* Integration Pages */}
          <Route path="/gmail-import" element={<GmailImport />} />
          <Route path="/connect-linkedin" element={<ConnectLinkedin />} />
          <Route path="/integrations-settings" element={<IntegrationsSettings />} />
          
          {/* OAuth Callback Routes - Handle authentication returns */}
          <Route path="/gmail-callback" element={<GmailCallback />} />
          <Route path="/linkedin-callback" element={<LinkedinCallback />} />
          
          {/* ============================================
              ERROR HANDLING
          ============================================ */}
          
          {/* 404 Not Found */}
          <Route path="/404" element={<NotFound />} />
          
          {/* Catch All - Redirect unknown routes to 404 */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;