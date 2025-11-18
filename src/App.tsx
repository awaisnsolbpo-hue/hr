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
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Public Job Application Routes */}
          <Route path="/jobs/public/:jobId" element={<PublicJobView />} />
          <Route path="/upload/:linkCode" element={<PublicUpload />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* NEW: Dashboard Metric Pages */}
          <Route path="/dashboard/active-jobs" element={<ActiveJobsPage />} />
          <Route path="/dashboard/total-candidates" element={<TotalCandidatesPage />} />
          <Route path="/dashboard/qualified" element={<InitialInterviewQualifiedPage />} />
          <Route path="/dashboard/scheduled-interviews" element={<ScheduledInterviewsPage />} />
          <Route path="/dashboard/shortlisted" element={<ShortlistedCandidatesPage />} />
          <Route path="/dashboard/success-rate" element={<SuccessRatePage />} />
          
          {/* Job Management Routes */}
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/create-job" element={<CreateJob />} />
          <Route path="/job/:jobId" element={<JobDetail />} />
          
          {/* Candidate Management Routes */}
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/import-candidates" element={<ImportCandidates />} />
          <Route path="/search-candidates" element={<CandidateSearch />} />
          <Route path="/advanced-search" element={<AdvancedSearch />} />
          
          {/* Interview Routes */}
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/scheduled-meetings" element={<ScheduledMeetings />} />
          
          {/* AI Interview Routes */}
          <Route path="/interview-landing" element={<InterviewLandingPage />} />
          <Route path="/interview-room" element={<InterviewRoom />} />
          
          {/* Integration Routes */}
          <Route path="/gmail-import" element={<GmailImport />} />
          <Route path="/connect-linkedin" element={<ConnectLinkedin />} />
          {/* <Route path="/linkedin-scraper" element={<LinkedinScraper />} /> */}
          <Route path="/integrations-settings" element={<IntegrationsSettings />} />
          
          {/* OAuth Callback Routes */}
          <Route path="/gmail-callback" element={<GmailCallback />} />
          <Route path="/linkedin-callback" element={<LinkedinCallback />} />
          
          {/* 404 Page */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;