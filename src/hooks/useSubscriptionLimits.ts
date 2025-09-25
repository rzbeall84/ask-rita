import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  remainingCount?: number;
  limitType?: 'users' | 'queries' | 'storage';
}

export const useSubscriptionLimits = () => {
  const { subscription, usageStats, checkLimit, trackQuery } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkUserLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!usageStats) {
      return { allowed: false, message: 'Loading usage data...' };
    }

    const result = await checkLimit('users');
    
    if (!result.success) {
      return {
        allowed: false,
        message: result.message,
        remainingCount: 0,
        limitType: 'users'
      };
    }

    const remaining = (usageStats.users.limit || 2) - (usageStats.users.current || 0);
    return {
      allowed: true,
      remainingCount: remaining,
      limitType: 'users'
    };
  }, [usageStats, checkLimit]);

  const checkQueryLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!usageStats) {
      return { allowed: false, message: 'Loading usage data...' };
    }

    const result = await checkLimit('queries');
    
    if (!result.success) {
      return {
        allowed: false,
        message: result.message,
        remainingCount: 0,
        limitType: 'queries'
      };
    }

    const remaining = (usageStats.queries.limit || 100) - (usageStats.queries.current || 0);
    return {
      allowed: true,
      remainingCount: remaining,
      limitType: 'queries'
    };
  }, [usageStats, checkLimit]);

  const checkStorageLimit = useCallback((): LimitCheckResult => {
    if (!usageStats) {
      return { allowed: false, message: 'Loading usage data...' };
    }

    const usedGb = usageStats.storage.used_gb || 0;
    const limitGb = usageStats.storage.limit_gb || 5;
    const remaining = limitGb - usedGb;
    
    if (remaining <= 0) {
      return {
        allowed: false,
        message: 'Storage limit reached. Please upgrade your plan or delete some files.',
        remainingCount: 0,
        limitType: 'storage'
      };
    }

    if (remaining <= 0.5) {
      toast({
        title: "Storage Warning",
        description: `Only ${remaining.toFixed(1)}GB of storage remaining.`,
        variant: "destructive",
      });
    }

    return {
      allowed: true,
      remainingCount: remaining,
      limitType: 'storage'
    };
  }, [usageStats, toast]);

  const enforceUserLimit = useCallback(async (actionName: string = "perform this action"): Promise<boolean> => {
    const check = await checkUserLimit();
    
    if (!check.allowed) {
      toast({
        title: "User Limit Reached",
        description: check.message || `Cannot ${actionName}. User limit reached.`,
        variant: "destructive",
        action: {
          label: "Upgrade Plan",
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }

    if (check.remainingCount && check.remainingCount <= 1) {
      toast({
        title: "Approaching User Limit",
        description: `Only ${check.remainingCount} user slot${check.remainingCount === 1 ? '' : 's'} remaining.`,
      });
    }

    return true;
  }, [checkUserLimit, toast, navigate]);

  const enforceQueryLimit = useCallback(async (queryText?: string, responseText?: string): Promise<boolean> => {
    const check = await checkQueryLimit();
    
    if (!check.allowed) {
      toast({
        title: "Query Limit Reached",
        description: check.message || "Monthly query limit reached. Please upgrade your plan.",
        variant: "destructive",
        action: {
          label: "Upgrade Plan",
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }

    // Track the query
    const trackResult = await trackQuery(queryText, responseText);
    
    if (!trackResult.success) {
      return false;
    }

    // Warn when approaching limit
    const percentage = usageStats?.queries.percentage || 0;
    if (percentage >= 90 && percentage < 100) {
      toast({
        title: "Query Limit Warning",
        description: `${100 - percentage}% of monthly queries remaining.`,
      });
    }

    return true;
  }, [checkQueryLimit, trackQuery, usageStats, toast, navigate]);

  const enforceStorageLimit = useCallback((fileSize?: number): boolean => {
    const check = checkStorageLimit();
    
    if (!check.allowed) {
      toast({
        title: "Storage Limit Reached",
        description: check.message || "Storage limit reached. Please upgrade or delete files.",
        variant: "destructive",
        action: {
          label: "Manage Storage",
          onClick: () => navigate('/billing'),
        },
      });
      return false;
    }

    if (fileSize && check.remainingCount) {
      const fileSizeGb = fileSize / (1024 * 1024 * 1024);
      if (fileSizeGb > check.remainingCount) {
        toast({
          title: "File Too Large",
          description: `File size (${fileSizeGb.toFixed(2)}GB) exceeds available storage (${check.remainingCount.toFixed(2)}GB).`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  }, [checkStorageLimit, toast, navigate]);

  const getUsagePercentage = useCallback((type: 'users' | 'queries' | 'storage'): number => {
    if (!usageStats) return 0;
    
    switch(type) {
      case 'users':
        return usageStats.users.percentage || 0;
      case 'queries':
        return usageStats.queries.percentage || 0;
      case 'storage':
        return usageStats.storage.percentage || 0;
      default:
        return 0;
    }
  }, [usageStats]);

  const canAddUsers = useCallback((): boolean => {
    return usageStats?.users.can_add_more || false;
  }, [usageStats]);

  const canMakeQueries = useCallback((): boolean => {
    return usageStats?.queries.can_query_more || false;
  }, [usageStats]);

  const getRemainingQueries = useCallback((): number => {
    if (!usageStats) return 0;
    return (usageStats.queries.limit || 100) - (usageStats.queries.current || 0);
  }, [usageStats]);

  const getRemainingUsers = useCallback((): number => {
    if (!usageStats) return 0;
    return (usageStats.users.limit || 2) - (usageStats.users.current || 0);
  }, [usageStats]);

  const showUpgradePrompt = useCallback((feature: string) => {
    toast({
      title: "Upgrade Required",
      description: `Upgrade your plan to access ${feature}.`,
      variant: "destructive",
      action: {
        label: "View Plans",
        onClick: () => navigate('/pricing'),
      },
    });
  }, [toast, navigate]);

  const isFreePlan = useCallback((): boolean => {
    return !subscription?.subscribed || subscription?.plan_type === 'free';
  }, [subscription]);

  return {
    // Check functions (don't show toasts)
    checkUserLimit,
    checkQueryLimit,
    checkStorageLimit,
    
    // Enforce functions (show toasts and handle navigation)
    enforceUserLimit,
    enforceQueryLimit,
    enforceStorageLimit,
    
    // Helper functions
    getUsagePercentage,
    canAddUsers,
    canMakeQueries,
    getRemainingQueries,
    getRemainingUsers,
    showUpgradePrompt,
    isFreePlan,
    
    // Direct access to stats
    usageStats,
    subscription
  };
};