import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Signup from "./pages/Signup";
import AdminSignup from "./pages/AdminSignup";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Billing from "./pages/Billing";
import Managers from "./pages/Managers";
import Users from "./pages/Users";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import Demo from "./pages/Demo";
import AdminDemo from "./pages/AdminDemo";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import InvitePage from "./pages/InvitePage";
import OrganizationSettings from "./pages/OrganizationSettings";
import GetStarted from "./pages/GetStarted";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/demo" element={<Navigate to="/admin-demo" replace />} />
              <Route path="/admin-demo" element={<AdminDemo />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              
              {/* Protected routes - accessible to all authenticated users */}
              <Route path="/dashboard/chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              
              {/* Admin-only routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireSuperAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/super-admin" element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/documents" element={
                <ProtectedRoute requireAdmin>
                  <Documents />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/managers" element={
                <ProtectedRoute requireAdmin>
                  <Managers />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/users" element={
                <ProtectedRoute requireAdmin>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute requireAdmin>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute requireAdmin>
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="/organization/settings" element={
                <ProtectedRoute requireAdmin>
                  <OrganizationSettings />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
