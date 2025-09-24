import { Header } from "@/components/Header";
import { EnhancedPricingCard } from "@/components/EnhancedPricingCard";
import { Check, Star, Zap, ArrowRight, GraduationCap, Briefcase, Truck, UserCheck } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    title: "Recruiter Training",
    description: "Advanced AI-powered training modules to enhance recruiter skills and efficiency.",
    icon: GraduationCap,
  },
  {
    title: "Jobs",
    description: "Intelligent job matching and management system for better candidate placement.",
    icon: Briefcase,
  },
  {
    title: "Carriers",
    description: "Comprehensive carrier database with AI-powered insights and analytics.",
    icon: Truck,
  },
  {
    title: "Driver Qualifications",
    description: "Automated driver qualification verification and compliance tracking.",
    icon: UserCheck,
  },
];

const pricingPlans = [
  {
    title: "Starter",
    price: "$150",
    originalPrice: "$199",
    introText: "for 3 months",
    standardText: "then $199/month",
    features: [
      "3 team members · 20GB storage · 1,500 AI queries/mo · Basic analytics"
    ],
    buttonText: "Start Subscription",
    isPopular: false,
    planType: "starter" as const,
  },
  {
    title: "Pro",
    price: "$350",
    originalPrice: "$499",
    introText: "for 3 months",
    standardText: "then $499/month",
    features: [
      "Unlimited team · 100GB storage · 5,000 AI queries/mo · Advanced analytics · White-label"
    ],
    buttonText: "Start Subscription",
    isPopular: true,
    planType: "pro" as const,
  },
  {
    title: "Enterprise",
    price: "$990",
    originalPrice: "$1,200",
    introText: "for 3 months",
    standardText: "then $1,200/month",
    features: [
      "Unlimited everything · 500GB storage · 15,000 AI queries/mo · Priority support · Custom integrations"
    ],
    buttonText: "Contact Sales",
    isPopular: false,
    planType: "enterprise" as const,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header showAuthButtons />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        
        <div className="container mx-auto text-center max-w-4xl relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 mb-8">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Transparent Pricing</span>
          </div>
          
          <h1 className="mb-8 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Choose Your Rita Plan
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-16 leading-relaxed font-medium max-w-3xl mx-auto">
            Start with our flexible plans designed to grow with your recruiting needs. No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* Special Pricing Alert */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">Special Early Adopter Pricing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              3-month introductory pricing exclusively for new subscribers. After 3 months, billing continues at standard rates.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">{pricingPlans.map((plan, index) => (
              <EnhancedPricingCard
                key={index}
                title={plan.title}
                price={plan.price}
                originalPrice={plan.originalPrice}
                introText={plan.introText}
                standardText={plan.standardText}
                features={plan.features}
                isPopular={plan.isPopular}
                buttonText={plan.buttonText}
                planType={plan.planType}
              />
            ))}
          </div>
          
          {/* Usage Note */}
          <div className="text-center mt-12 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground bg-muted/30 px-6 py-4 rounded-xl border border-muted">
              Usage counted per organization, reset monthly. When you hit the cap, new AI questions pause until the next cycle.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="mb-6">Powerful features for modern recruiting</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Both plans include our core features to help you recruit more effectively.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;