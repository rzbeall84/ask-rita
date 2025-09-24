import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  planType: 'starter' | 'professional';
}

export const PricingCard = ({ title, price, originalPrice, features, isPopular = false, buttonText, planType }: PricingCardProps) => {
  return (
    <div className={`group relative ${isPopular ? 'scale-105' : ''}`}>
      {/* Glow effect for popular */}
      {isPopular && (
        <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-3xl blur-xl" />
      )}
      
      <div className={`relative bg-gradient-card rounded-3xl p-10 border-2 shadow-card hover:shadow-xl transition-all duration-300 ${
        isPopular ? 'border-primary/50' : 'border-border hover:border-primary/30'
      }`}>
        {isPopular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 bg-gradient-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-2xl shadow-glow">
              <Zap className="w-4 h-4" />
              Most Popular
            </div>
          </div>
        )}
        
        <div className="text-center mb-8">
          <div className="mb-4">
            <h3 className="text-4xl font-black bg-gradient-primary bg-clip-text text-transparent mb-2 tracking-tight">{title}</h3>
            <div className="w-12 h-1 bg-gradient-primary mx-auto rounded-full"></div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            {originalPrice && (
              <div className="text-2xl font-semibold text-muted-foreground line-through">{originalPrice}</div>
            )}
            <div className="text-5xl font-black text-primary">{price}</div>
          </div>
          <div className="text-muted-foreground font-medium">per month</div>
        </div>

        <ul className="space-y-4 mb-10">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-success" />
              </div>
              <span className="text-card-foreground font-medium leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>

        <Link to="/waitlist" className="block">
          <Button 
            className={`w-full h-12 text-base font-semibold rounded-2xl transition-all duration-300 ${
              isPopular 
                ? 'bg-gradient-primary hover:shadow-glow' 
                : 'bg-gradient-secondary hover:bg-gradient-primary hover:text-primary-foreground'
            }`}
            variant={isPopular ? "default" : "outline"}
            size="lg"
          >
            {buttonText}
          </Button>
        </Link>
      </div>
    </div>
  );
};