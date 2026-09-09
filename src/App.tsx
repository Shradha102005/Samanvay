import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TenantLayout from "@/layouts/TenantLayout";
import Index from "./pages/Index";
import About from "./pages/About";
import Problems from "./pages/Problems";
import Departments from "./pages/Departments";
import ProblemDetails from "./pages/ProblemDetails";
import Events from "./pages/Events";
import Resources from "./pages/Resources";
import Registration from "./pages/Registration";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import EventDetails from "./pages/EventDetails";
import EventRegister from "./pages/EventRegister";
import ScrollToTop from "./components/ScrollToTop";
import SubmitProblem from "./pages/SubmitProblem";
import UniversityDashboard from "./pages/UniversityDashboard";
import SubmissionsQueue from "./pages/SubmissionsQueue";
import GovtAnalytics from "./pages/GovtAnalytics";

const queryClient = new QueryClient();
const defaultTenantSlug = "gcet";

function LegacyTenantRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`/${defaultTenantSlug}${location.pathname}${location.search}${location.hash}`}
      replace
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Navigate to={`/${defaultTenantSlug}`} replace />} />
            <Route path="/about" element={<LegacyTenantRedirect />} />
            <Route path="/auth" element={<LegacyTenantRedirect />} />
            <Route path="/problems" element={<LegacyTenantRedirect />} />
            <Route path="/problems/:id" element={<LegacyTenantRedirect />} />
            <Route path="/events" element={<LegacyTenantRedirect />} />
            <Route path="/events/:id/register" element={<LegacyTenantRedirect />} />
            <Route path="/events/:id" element={<LegacyTenantRedirect />} />
            <Route path="/resources" element={<LegacyTenantRedirect />} />
            <Route path="/registration" element={<LegacyTenantRedirect />} />
            <Route path="/contact" element={<LegacyTenantRedirect />} />
            <Route path="/departments" element={<LegacyTenantRedirect />} />
            <Route path="/admin" element={<LegacyTenantRedirect />} />
            <Route path="/profile" element={<LegacyTenantRedirect />} />
            <Route path="/submit" element={<LegacyTenantRedirect />} />
            <Route path="/university" element={<LegacyTenantRedirect />} />
            <Route path="/submissions" element={<LegacyTenantRedirect />} />
            <Route path="/analytics" element={<LegacyTenantRedirect />} />
            <Route path="/:tenantSlug" element={<TenantLayout />}>
              <Route index element={<Index />} />
              <Route path="about" element={<About />} />
              <Route path="auth" element={<Auth />} />
              <Route path="problems" element={<Problems />} />
              <Route path="problems/:id" element={<ProblemDetails />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:id/register" element={<EventRegister />} />
              <Route path="events/:id" element={<EventDetails />} />
              <Route path="resources" element={<Resources />} />
              <Route path="registration" element={<Registration />} />
              <Route path="contact" element={<Contact />} />
              <Route
                path="submit"
                element={
                  <ProtectedRoute allowedRoles={["citizen", "govt_officer", "industry_partner"]}>
                    <SubmitProblem />
                  </ProtectedRoute>
                }
              />
              <Route path="university" element={<UniversityDashboard />} />
              <Route path="submissions" element={<SubmissionsQueue />} />
              <Route path="analytics" element={<GovtAnalytics />} />
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="departments"
                element={
                  <ProtectedRoute requireAdmin>
                    <Departments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard/>
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
