import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";

export const SubscriptionStatusBanner = () => {
  const { hasAccess, needsUpgrade, gracePeriodEnd } = useSubscriptionAccess();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  if (hasAccess && !needsUpgrade) {
    return null; // No banner needed for active subscriptions
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!hasAccess) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Your subscription has expired. Please upgrade to continue using admin features.</span>
          <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (gracePeriodEnd) {
    return (
      <Alert className="mb-6 border-orange-200 bg-orange-50">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between text-orange-800">
          <span>
            Your subscription is {subscription?.status}. You have access until {formatDate(gracePeriodEnd)}.
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
            Manage Subscription
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};