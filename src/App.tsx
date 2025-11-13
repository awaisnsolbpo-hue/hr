import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MobileAppWrapper } from "@/components/MobileAppWrapper";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import CreateJob from "./pages/CreateJob";
import ConnectLinkedIn from "./pages/ConnectLinkedIn";
import ImportCandidates from "./pages/ImportCandidates";
import PublicUpload from "./pages/PublicUpload";
import PublicJobView from "./pages/PublicJobView";
import Candidates from "./pages/Candidates";
import Interviews from "./pages/Interviews";
import ScheduledMeetings from "./pages/ScheduledMeetings";
import NotFound from "./pages/NotFound";
import GmailCallback from "./pages/GmailCallback";
import GmailImport from "./pages/GmailImport";
import LinkedInCallback from "./pages/LinkedInCallback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MobileAppWrapper>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetail />} />
            
            {/* Public Job View Route - MUST be before /upload/:linkCode */}
            <Route path="/jobs/public/:jobId" element={<PublicJobView />} />
            
            <Route path="/create-job" element={<CreateJob />} />
            <Route path="/connect-linkedin" element={<ConnectLinkedIn />} />
            <Route path="/import-candidates" element={<ImportCandidates />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/scheduled-meetings" element={<ScheduledMeetings />} />
            <Route path="/upload/:linkCode" element={<PublicUpload />} />
            
            {/* Gmail OAuth Routes */}
            <Route path="/auth/callback" element={<GmailCallback />} />
            <Route path="/gmail-import" element={<GmailImport />} />
            
            {/* LinkedIn OAuth Route */}
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            
            {/* Catch-all route - MUST be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MobileAppWrapper>
    </TooltipProvider>
  </QueryClientProvider>
);
                                                                                      
export default App;