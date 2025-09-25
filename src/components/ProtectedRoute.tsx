import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, requireSuperAdmin = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const { hasAccess, isLoading: subscriptionLoading } = useSubscriptionAccess();
  const location = useLocation();

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin check - check for admin role
  if (requireSuperAdmin) {
    if (profile?.role !== 'admin') {
      return <Navigate to="/dashboard/chat" replace />;
    }
    // Super admin has unlimited access, skip subscription checks
    return <>{children}</>;
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard/chat" replace />;
  }

  // For admin routes, check subscription access
  if (requireAdmin && profile?.role === 'admin' && !hasAccess) {
    return <Navigate to="/billing" replace />;
  }

  return <>{children}</>;
};