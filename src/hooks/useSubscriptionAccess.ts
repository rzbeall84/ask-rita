import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEffect, useState } from 'react';

interface SubscriptionAccess {
  hasAccess: boolean;
  isLoading: boolean;
  needsUpgrade: boolean;
  gracePeriodEnd: string | null;
}

export const useSubscriptionAccess = (): SubscriptionAccess => {
  const { user, profile } = useAuth();
  const { subscription, loading } = useSubscription();
  const [accessStatus, setAccessStatus] = useState<SubscriptionAccess>({
    hasAccess: false,
    isLoading: true,
    needsUpgrade: false,
    gracePeriodEnd: null,
  });

  useEffect(() => {
    if (loading) {
      setAccessStatus(prev => ({ ...prev, isLoading: true }));
      return;
    }

    // Regular users always have access (they don't pay)
    if (profile?.role !== 'admin') {
      setAccessStatus({
        hasAccess: true,
        isLoading: false,
        needsUpgrade: false,
        gracePeriodEnd: null,
      });
      return;
    }

    // Admins need active subscription or grace period
    if (!subscription) {
      setAccessStatus({
        hasAccess: false,
        isLoading: false,
        needsUpgrade: true,
        gracePeriodEnd: null,
      });
      return;
    }

    const now = new Date();
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    
    // Active or trialing subscription - full access
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      setAccessStatus({
        hasAccess: true,
        isLoading: false,
        needsUpgrade: false,
        gracePeriodEnd: null,
      });
      return;
    }

    // Past due or canceled but still in grace period
    if ((subscription.status === 'past_due' || subscription.status === 'canceled') && periodEnd && periodEnd > now) {
      setAccessStatus({
        hasAccess: true,
        isLoading: false,
        needsUpgrade: true,
        gracePeriodEnd: subscription.current_period_end,
      });
      return;
    }

    // No access
    setAccessStatus({
      hasAccess: false,
      isLoading: false,
      needsUpgrade: true,
      gracePeriodEnd: null,
    });
  }, [user, profile, subscription, loading]);

  return accessStatus;
};