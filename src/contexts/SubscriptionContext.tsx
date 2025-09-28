import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  subscribed: boolean;
  status: string;
  plan_type: string | null;
  current_period_end: string | null;
  storage_limit_gb?: number;
  storage_used_gb?: number;
  query_limit?: number;
  queries_used?: number;
  stripe_price_id?: string | null;
  user_limit?: number;
  user_count?: number;
}

interface UsageStats {
  users: {
    current: number;
    limit: number;
    percentage: number;
    can_add_more: boolean;
  };
  queries: {
    current: number;
    limit: number;
    extra_purchased: number;
    total_available: number;
    percentage: number;
    can_query_more: boolean;
    reset_date: string;
  };
  storage: {
    used_gb: number;
    limit_gb: number;
    percentage: number;
  };
  subscription: {
    status: string;
    plan_type: string;
    current_period_end: string | null;
  };
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  usageStats: UsageStats | null;
  refreshSubscription: () => Promise<void>;
  refreshUsageStats: () => Promise<void>;
  createCheckoutSession: (planType: 'starter' | 'pro' | 'enterprise') => Promise<void>;
  purchaseOveragePack: (packType: 'pack_1000' | 'pack_5000' | 'pack_10000') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  checkLimit: (limitType: 'users' | 'queries') => Promise<{ success: boolean; message: string }>;
  trackQuery: (queryText?: string, responseText?: string) => Promise<{ success: boolean; message: string }>;
}

const PLAN_LIMITS = {
  starter: { users: 3, queries: 1500, storage: 20 },
  pro: { users: -1, queries: 5000, storage: 100 },
  enterprise: { users: -1, queries: 15000, storage: 500 },
  free: { users: 2, queries: 100, storage: 5 },
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const refreshSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSubscription(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Error",
          description: "Failed to check subscription status",
          variant: "destructive",
        });
        return;
      }

      // Add plan limits to subscription data
      const planType = data?.plan_type || 'free';
      const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
      
      setSubscription({
        ...data,
        user_limit: limits.users,
        query_limit: limits.queries,
        storage_limit_gb: limits.storage,
      });
    } catch (error) {
      console.error('Error in refreshSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsageStats = async () => {
    try {
      if (!profile?.organization_id) return;

      // Get subscription data for plan limits (removed queries_used as it's in query_usage table)
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('plan_type, query_limit, current_period_start, current_period_end, unlimited_usage')
        .eq('organization_id', profile.organization_id)
        .single();

      const planType = subscriptionData?.plan_type || 'free';
      const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

      // Get current billing period query usage including extra purchased
      let billingPeriodKey: string;
      if (subscriptionData?.current_period_start) {
        billingPeriodKey = subscriptionData.current_period_start.split('T')[0];
      } else {
        // Fallback to current month for free tier
        billingPeriodKey = new Date().toISOString().slice(0, 7) + '-01';
      }
      
      const { data: queryUsage } = await (supabase as any)
        .from('query_usage')
        .select('queries_used, extra_queries_purchased')
        .eq('org_id', profile.organization_id)
        .eq('billing_period', billingPeriodKey)
        .single();

      const queriesUsed = queryUsage?.queries_used || 0;
      const extraPurchased = queryUsage?.extra_queries_purchased || 0;
      const baseLimit = limits.queries;
      const totalAvailable = baseLimit + extraPurchased;
      
      // Handle unlimited usage from promo codes
      if (subscriptionData?.unlimited_usage === true) {
        const stats: UsageStats = {
          users: {
            current: 0,
            limit: 999999,
            percentage: 0,
            can_add_more: true
          },
          queries: {
            current: queriesUsed,
            limit: 999999999,
            extra_purchased: extraPurchased,
            total_available: 999999999,
            percentage: 0,
            can_query_more: true,
            reset_date: subscriptionData?.current_period_end || new Date().toISOString()
          },
          storage: {
            used_gb: 0,
            limit_gb: 999999,
            percentage: 0
          },
          subscription: {
            status: 'unlimited',
            plan_type: planType,
            current_period_end: subscriptionData?.current_period_end || null
          }
        };
        
        setUsageStats(stats);
        return;
      }
      
      const queryPercentage = totalAvailable > 0 ? Math.min((queriesUsed / totalAvailable) * 100, 100) : 0;

      // Get organization data for user count
      const { data: orgData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('organization_id', profile.organization_id);

      const userCount = orgData?.length || 0;
      const userLimit = limits.users === -1 ? 999999 : limits.users;
      const userPercentage = userLimit > 0 ? Math.min((userCount / userLimit) * 100, 100) : 0;

      const stats: UsageStats = {
        users: {
          current: userCount,
          limit: userLimit,
          percentage: userPercentage,
          can_add_more: userCount < userLimit
        },
        queries: {
          current: queriesUsed,
          limit: baseLimit,
          extra_purchased: extraPurchased,
          total_available: totalAvailable,
          percentage: queryPercentage,
          can_query_more: queriesUsed < totalAvailable,
          reset_date: subscriptionData?.current_period_end || new Date().toISOString()
        },
        storage: {
          used_gb: 0, // TODO: Implement storage tracking
          limit_gb: limits.storage,
          percentage: 0
        },
        subscription: {
          status: subscriptionData?.plan_type ? 'active' : 'free',
          plan_type: planType,
          current_period_end: subscriptionData?.current_period_end || null
        }
      };

      setUsageStats(stats);
    } catch (error) {
      console.error('Error in refreshUsageStats:', error);
    }
  };

  const checkLimit = async (limitType: 'users' | 'queries'): Promise<{ success: boolean; message: string }> => {
    try {
      if (!profile?.organization_id) {
        return { success: false, message: 'No organization found' };
      }

      const { data, error } = await (supabase.rpc as any)('check_subscription_limits', {
        p_organization_id: profile.organization_id,
        p_limit_type: limitType,
      });

      if (error) {
        console.error('Error checking limits:', error);
        return { success: false, message: 'Failed to check limits' };
      }

      // Parse JSON response from RPC function
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        toast({
          title: "Limit Reached",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      console.error('Error in checkLimit:', error);
      return { success: false, message: 'An error occurred while checking limits' };
    }
  };

  const trackQuery = async (queryText?: string, responseText?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !profile?.organization_id) {
        return { success: false, message: 'Not authenticated or no organization' };
      }

      const { data, error } = await (supabase.rpc as any)('track_query_usage', {
        p_organization_id: profile.organization_id,
        p_query_text: queryText,
        p_response_text: responseText,
      });

      if (error) {
        console.error('Error tracking query:', error);
        return { success: false, message: 'Failed to track query usage' };
      }

      // Parse JSON response from RPC function
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        toast({
          title: "Query Limit Reached",
          description: result.message,
          variant: "destructive",
          action: (
            <ToastAction 
              altText="Upgrade" 
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade
            </ToastAction>
          ),
        });
      }

      // Refresh stats after tracking
      await refreshUsageStats();
      
      return result;
    } catch (error) {
      console.error('Error in trackQuery:', error);
      return { success: false, message: 'An error occurred while tracking query' };
    }
  };

  const createCheckoutSession = async (planType: 'starter' | 'pro' | 'enterprise') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to subscribe to a plan",
          variant: "destructive",
        });
        return;
      }

      // Enterprise plan now supports self-serve checkout with intro pricing
      // Remove the mailto redirect to enable direct purchase

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planType },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
        return;
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error in createCheckoutSession:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to manage your subscription",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error opening customer portal:', error);
        toast({
          title: "Error",
          description: "Failed to open customer portal",
          variant: "destructive",
        });
        return;
      }

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error in openCustomerPortal:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const purchaseOveragePack = async (packType: 'pack_1000' | 'pack_5000' | 'pack_10000') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase additional queries",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-overage-checkout', {
        body: { packType },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating overage checkout:', error);
        toast({
          title: "Error",
          description: "Failed to create checkout session for additional queries",
          variant: "destructive",
        });
        return;
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirecting to Checkout",
        description: `You're being redirected to purchase ${data.pack.name}`,
      });
    } catch (error) {
      console.error('Error in purchaseOveragePack:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check subscription on mount
    refreshSubscription();

    // Set up auth state change listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          refreshSubscription();
        } else if (event === 'SIGNED_OUT') {
          setSubscription(null);
          setUsageStats(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  // Refresh usage stats when profile changes
  useEffect(() => {
    if (profile?.organization_id) {
      refreshUsageStats();
      // Set up interval to refresh stats every 30 seconds
      const interval = setInterval(refreshUsageStats, 30000);
      return () => clearInterval(interval);
    }
  }, [profile?.organization_id]);

  const value: SubscriptionContextType = {
    subscription,
    loading,
    usageStats,
    refreshSubscription,
    refreshUsageStats,
    createCheckoutSession,
    purchaseOveragePack,
    openCustomerPortal,
    checkLimit,
    trackQuery,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};