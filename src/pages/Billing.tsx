import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  ExternalLink, 
  Loader2, 
  Users, 
  MessageSquare, 
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { SubscriptionStatusBanner } from "@/components/SubscriptionStatusBanner";
import { useEffect } from "react";

const Billing = () => {
  const { subscription, loading, usageStats, openCustomerPortal, refreshUsageStats, purchaseOveragePack } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    refreshUsageStats();
  }, []);

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanDisplayName = (planType: string | null) => {
    if (!planType) return "Free Plan";
    switch(planType) {
      case 'starter': return "Starter Plan";
      case 'pro': return "Pro Plan";
      case 'enterprise': return "Enterprise Plan";
      default: return "Free Plan";
    }
  };

  const getPlanPrice = (planType: string | null) => {
    switch (planType) {
      case 'starter': return '$199';
      case 'pro': return '$499';
      case 'enterprise': return '$1,200';
      default: return '$0';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Past Due</Badge>;
      case 'canceled':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" /> Canceled</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  const isFreePlan = !subscription?.subscribed || subscription?.plan_type === 'free';

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl">
        <SubscriptionStatusBanner />
        
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and track usage.</p>
        </div>

        {/* Main Subscription Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </CardTitle>
              {getStatusBadge(subscription?.status || 'free')}
            </div>
            <CardDescription>Your current plan and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-xl font-bold text-primary" data-testid="text-current-plan">
                  {getPlanDisplayName(subscription?.plan_type)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-xl font-bold" data-testid="text-monthly-cost">
                  {getPlanPrice(subscription?.plan_type)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Next Billing</p>
                <p className="text-sm font-medium" data-testid="text-next-billing">
                  {formatDate(subscription?.current_period_end)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-medium capitalize" data-testid="text-subscription-status">
                  {subscription?.status || 'Free'}
                </p>
              </div>
            </div>

            {isFreePlan && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You're on the free plan with limited features. Upgrade to unlock more users and queries.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 flex-wrap">
              {!isFreePlan ? (
                <>
                  <Button variant="outline" onClick={handleManageSubscription} data-testid="button-manage-subscription">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                  <Button variant="outline" onClick={handleUpgrade} data-testid="button-change-plan">
                    Change Plan
                  </Button>
                </>
              ) : (
                <Button onClick={handleUpgrade} data-testid="button-upgrade-plan">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade to Paid Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Usage Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </span>
                <span className="text-sm text-muted-foreground" data-testid="text-users-usage">
                  {usageStats?.users.current || 0} / {usageStats?.users.limit || 2}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress 
                value={usageStats?.users.percentage || 0} 
                className="h-2"
                data-testid="progress-users"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usageStats?.users.current || 0} used</span>
                <span>{(usageStats?.users.limit || 2) - (usageStats?.users.current || 0)} available</span>
              </div>
              {!usageStats?.users.can_add_more && (
                <Alert className="py-2">
                  <AlertDescription className="text-xs">
                    User limit reached. Upgrade to add more team members.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Queries Usage Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  AI Queries
                </span>
                <span className="text-sm text-muted-foreground" data-testid="text-queries-usage">
                  {usageStats?.queries.current || 0} / {usageStats?.queries.total_available || usageStats?.queries.limit || 100}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress 
                value={usageStats?.queries.percentage || 0} 
                className="h-2"
                data-testid="progress-queries"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usageStats?.queries.current || 0} used</span>
                <span>{(usageStats?.queries.total_available || usageStats?.queries.limit || 100) - (usageStats?.queries.current || 0)} remaining</span>
              </div>
              {usageStats?.queries.extra_purchased && usageStats.queries.extra_purchased > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  +{usageStats.queries.extra_purchased.toLocaleString()} extra queries purchased
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Resets {formatDate(usageStats?.queries.reset_date || null)}</span>
              </div>
              {usageStats?.queries.percentage && usageStats.queries.percentage >= 80 && (
                <Alert className="py-2">
                  <AlertDescription className="text-xs">
                    {usageStats.queries.percentage >= 100 
                      ? "Query limit reached. Purchase more queries or upgrade for higher monthly limits."
                      : `${Math.round(100 - usageStats.queries.percentage)}% of queries remaining.`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Storage Usage Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Storage
                </span>
                <span className="text-sm text-muted-foreground" data-testid="text-storage-usage">
                  {usageStats?.storage.used_gb || 0}GB / {usageStats?.storage.limit_gb || 5}GB
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress 
                value={usageStats?.storage.percentage || 0} 
                className="h-2"
                data-testid="progress-storage"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usageStats?.storage.used_gb || 0}GB used</span>
                <span>{(usageStats?.storage.limit_gb || 5) - (usageStats?.storage.used_gb || 0)}GB available</span>
              </div>
              {usageStats?.storage.percentage && usageStats.storage.percentage >= 90 && (
                <Alert className="py-2">
                  <AlertDescription className="text-xs">
                    Storage nearly full. Consider upgrading or cleaning up files.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Query Overage Packs */}
        {!isFreePlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Purchase Additional Queries
              </CardTitle>
              <CardDescription>
                Need more queries this month? Purchase additional query packs that add to your monthly allowance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1,000 Query Pack */}
                <Card className="relative">
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <div className="text-2xl font-bold">1,000</div>
                      <div className="text-sm text-muted-foreground">Additional Queries</div>
                      <div className="text-3xl font-bold">$25</div>
                      <div className="text-xs text-muted-foreground">One-time purchase</div>
                      <Button 
                        className="w-full" 
                        onClick={() => purchaseOveragePack('pack_1000')}
                        data-testid="button-purchase-1000"
                      >
                        Purchase Pack
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 5,000 Query Pack */}
                <Card className="relative border-primary">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary">Best Value</Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <div className="text-2xl font-bold">5,000</div>
                      <div className="text-sm text-muted-foreground">Additional Queries</div>
                      <div className="text-3xl font-bold">$90</div>
                      <div className="text-xs text-muted-foreground">One-time purchase</div>
                      <div className="text-xs text-green-600 font-medium">Save $35 vs 1k packs</div>
                      <Button 
                        className="w-full" 
                        onClick={() => purchaseOveragePack('pack_5000')}
                        data-testid="button-purchase-5000"
                      >
                        Purchase Pack
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 10,000 Query Pack */}
                <Card className="relative">
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <div className="text-2xl font-bold">10,000</div>
                      <div className="text-sm text-muted-foreground">Additional Queries</div>
                      <div className="text-3xl font-bold">$150</div>
                      <div className="text-xs text-muted-foreground">One-time purchase</div>
                      <div className="text-xs text-green-600 font-medium">Save $100 vs 1k packs</div>
                      <Button 
                        className="w-full" 
                        onClick={() => purchaseOveragePack('pack_10000')}
                        data-testid="button-purchase-10000"
                      >
                        Purchase Pack
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Query packs add to your current monthly allowance immediately</li>
                  <li>• Unused queries from packs expire at your next billing cycle</li>
                  <li>• Purchase multiple packs if needed - they stack together</li>
                  <li>• {usageStats?.queries.extra_purchased && usageStats.queries.extra_purchased > 0 
                    ? `You currently have ${usageStats.queries.extra_purchased.toLocaleString()} extra queries available`
                    : 'No extra queries currently purchased'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Comparison</CardTitle>
            <CardDescription>Compare features across different plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Feature</th>
                    <th className="text-center py-2">Free</th>
                    <th className="text-center py-2">Starter</th>
                    <th className="text-center py-2">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Team Members</td>
                    <td className="text-center">2</td>
                    <td className="text-center">5</td>
                    <td className="text-center">20</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">AI Queries/Month</td>
                    <td className="text-center">100</td>
                    <td className="text-center">1,000</td>
                    <td className="text-center">10,000</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Storage</td>
                    <td className="text-center">5 GB</td>
                    <td className="text-center">20 GB</td>
                    <td className="text-center">100 GB</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Price/Month</td>
                    <td className="text-center">$0</td>
                    <td className="text-center">$199</td>
                    <td className="text-center">$499</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {isFreePlan && (
              <div className="mt-4 text-center">
                <Button onClick={handleUpgrade} className="w-full sm:w-auto" data-testid="button-compare-upgrade">
                  View All Plans & Upgrade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        {!isFreePlan && (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Payment</CardTitle>
              <CardDescription>Manage your billing and payment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Access your complete billing history, download invoices, and manage payment methods in the Stripe Customer Portal.
                </p>
                <Button variant="outline" onClick={handleManageSubscription} data-testid="button-billing-history">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Customer Portal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Billing;