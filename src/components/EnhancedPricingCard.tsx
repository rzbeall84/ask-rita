import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface EnhancedPricingCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  introText?: string;
  standardText?: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  planType: 'starter' | 'pro' | 'enterprise';
}

export const EnhancedPricingCard = ({
  title,
  price,
  originalPrice,
  introText,
  standardText,
  features,
  isPopular,
  buttonText,
  planType
}: EnhancedPricingCardProps) => {
  const { createCheckoutSession, subscription } = useSubscription();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const isCurrentPlan = subscription?.plan_type === planType;
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      // Redirect to signup with selected plan
      navigate(`/signup?plan=${planType}`);
      return;
    }

    if (!isAdmin) {
      // Regular users don't need subscriptions
      return;
    }

    if (planType === 'enterprise') {
      // Handle enterprise contact sales
      window.open('mailto:sales@askrita.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    try {
      await createCheckoutSession(planType);
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) return "Current Plan";
    if (!isAuthenticated) return "Get Started";
    if (!isAdmin) return "Admin Only";
    if (planType === 'enterprise') return "Contact Sales";
    return "Upgrade Now";
  };

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'bg-primary/5 border-primary' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}
      
      {isCurrentPlan && (
        <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
          Your Plan
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold">{price}</span>
          <div className="flex flex-col items-start">
            <span className="text-muted-foreground text-sm">/month</span>
            {introText && (
              <span className="text-xs text-primary font-medium">{introText}</span>
            )}
          </div>
        </div>
        {standardText && (
          <p className="text-sm text-muted-foreground mt-1">
            {standardText}
          </p>
        )}
        {originalPrice && originalPrice !== price && !standardText && (
          <p className="text-sm text-muted-foreground">
            <span className="line-through">{originalPrice}</span> per month
          </p>
        )}
      </CardHeader>

      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          variant={isCurrentPlan ? "outline" : (isPopular ? "default" : "outline")}
          onClick={handleSubscribe}
          disabled={isCurrentPlan || (!isAdmin && isAuthenticated)}
        >
          {getButtonText()}
        </Button>
      </CardFooter>
    </Card>
  );
};