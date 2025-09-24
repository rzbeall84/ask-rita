import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, ExternalLink, Loader2 } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { SubscriptionStatusBanner } from "@/components/SubscriptionStatusBanner";

const Billing = () => {
  const { subscription, loading, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  const handleChangePlan = () => {
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
    if (!planType) return "Basic Plan";
    return planType.charAt(0).toUpperCase() + planType.slice(1) + " Plan";
  };

  const getPlanPrice = (planType: string | null) => {
    switch (planType) {
      case 'starter': return '$150';
      case 'pro': return '$350';
      case 'enterprise': return '$990';
      default: return '$0';
    }
  };

  const getStorageUsage = () => {
    const used = subscription?.storage_used_gb || 0;
    const limit = subscription?.storage_limit_gb || 20;
    return { used, limit, percentage: Math.min((used / limit) * 100, 100) };
  };

  const getQueryUsage = () => {
    const used = subscription?.queries_used || 0;
    const limit = subscription?.query_limit || 1500;
    return { used, limit, percentage: Math.min((used / limit) * 100, 100) };
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

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <SubscriptionStatusBanner />
        
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Current Plan
                  <Badge variant={subscription?.subscribed ? "default" : "outline"}>
                    {getPlanDisplayName(subscription?.plan_type)}
                  </Badge>
                </CardTitle>
                <CardDescription>Your subscription details and usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold text-primary">{getPlanPrice(subscription?.plan_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing</p>
                    <p className="font-medium">{formatDate(subscription?.current_period_end)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{subscription?.status || 'Inactive'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Storage Used</span>
                    <span className="text-sm font-medium">
                      {getStorageUsage().used.toFixed(1)}GB / {getStorageUsage().limit}GB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${getStorageUsage().percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Queries This Month</span>
                    <span className="text-sm font-medium">
                      {getQueryUsage().used.toLocaleString()} / {getQueryUsage().limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${getQueryUsage().percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button variant="outline" onClick={handleManageSubscription} disabled={!subscription?.subscribed}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                  <Button variant="outline" onClick={handleChangePlan}>Change Plan</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View and manage your billing through Stripe Customer Portal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Access your complete billing history, download invoices, and view payment details in the Stripe Customer Portal.
                  </p>
                  <Button variant="outline" onClick={handleManageSubscription} disabled={!subscription?.subscribed}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Billing History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <Badge variant="outline">Default</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Expires 12/25</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleManageSubscription} disabled={!subscription?.subscribed}>
                  Update Payment Method
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Questions about your subscription or billing? We're here to help.
                </p>
                <Button variant="outline" className="w-full">Contact Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Billing;