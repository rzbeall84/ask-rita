import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { FeatureCard } from "@/components/FeatureCard";
import { DemoTab } from "@/components/DemoTab";
import { GraduationCap, Briefcase, Truck, UserCheck, ArrowRight, Sparkles, CheckCircle, Users, MessageCircleQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageLogo } from "@/components/ImageLogo";

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

const Landing = () => {
  return (
    <div className="min-h-screen">
      <Header showAuthButtons />
      
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background"></div>
        
        <div className="container mx-auto text-center max-w-6xl relative">
          {/* Rita Logo */}
          <div className="mb-8">
            <ImageLogo size="hero" className="mx-auto animate-fade-in" />
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI-Powered Recruiting Assistant</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="mb-8 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Meet Rita – Your Recruiter Intelligence & Training Assistant
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-4xl mx-auto font-medium">
            Upload your jobs, carriers, drivers, and training files. Rita answers recruiter questions instantly with AI-powered precision.
          </p>
          
          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-primary hover:shadow-glow transition-all duration-300 group">
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300">
                View Pricing
              </Button>
            </Link>
            <Link to="/admin-demo">
              <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-hero text-white hover:shadow-glow hover:scale-105 transition-all duration-300 border-0">
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Recruiting Agencies Choose Rita Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-muted/30 to-primary/5">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Headline */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent leading-tight">
                Stop Repeating Answers. Start Seating Drivers Faster.
              </h2>
              
              {/* Pain Points */}
              <div className="space-y-6">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Recruiting agencies waste countless hours every week answering the same recruiter questions again and again:
                </p>
                
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">"Does this carrier take autos?"</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">"What's the hiring radius?"</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircleQuestion className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">"What's the DUI policy?"</span>
                  </div>
                </div>
              </div>
              
              {/* Solution */}
              <div className="space-y-6">
                <p className="text-lg text-foreground leading-relaxed">
                  <strong>With Rita, your recruiters get instant answers from your agency's own carrier and job files.</strong> That means fewer delays, faster submissions, and more drivers seated quickly.
                </p>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Instead of managers spending their day answering repeat questions, Rita empowers your recruiters to get answers instantly — so they can focus on connecting with drivers and filling trucks.
                </p>
              </div>
              
              {/* Benefits List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Save hours of manager time every week</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Keep recruiters productive and confident</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Spot knowledge gaps through question logs</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Seat drivers faster and keep carriers happy</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <div className="pt-4">
                <Link to="/signup">
                  <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-primary hover:shadow-glow transition-all duration-300 group">
                    Get Rita for Your Team
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right Column - Rita Chat Interface */}
            <div className="lg:col-span-2">
              <div className="relative">
                {/* Chat Interface Card */}
                <div className="bg-background/95 backdrop-blur-sm rounded-3xl p-6 border border-border/50 shadow-2xl">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Users className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">Recruiting Team</h4>
                    <p className="text-sm text-muted-foreground">Instant answers, faster placements</p>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="space-y-4 max-h-80 overflow-hidden">
                    {/* Question 1 */}
                    <div className="flex justify-end">
                      <div className="bg-muted/60 rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]">
                        <p className="text-sm text-foreground">"What's the DUI policy?"</p>
                      </div>
                    </div>
                    
                    {/* Answer 1 */}
                    <div className="flex justify-start">
                      <div className="bg-gradient-primary rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-md">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary-foreground mt-0.5 shrink-0" />
                          <p className="text-sm text-primary-foreground">3-year lookback, case-by-case review for incidents over 2 years</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Question 2 */}
                    <div className="flex justify-end">
                      <div className="bg-muted/60 rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]">
                        <p className="text-sm text-foreground">"Hiring radius for XYZ Carrier?"</p>
                      </div>
                    </div>
                    
                    {/* Answer 2 */}
                    <div className="flex justify-start">
                      <div className="bg-gradient-primary rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-md">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary-foreground mt-0.5 shrink-0" />
                          <p className="text-sm text-primary-foreground">500-mile radius from Dallas, TX terminal</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Question 3 */}
                    <div className="flex justify-end">
                      <div className="bg-muted/60 rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]">
                        <p className="text-sm text-foreground">"Does carrier ABC take autos?"</p>
                      </div>
                    </div>
                    
                    {/* Answer 3 */}
                    <div className="flex justify-start">
                      <div className="bg-gradient-primary rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-md">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary-foreground mt-0.5 shrink-0" />
                          <p className="text-sm text-primary-foreground">Yes, auto hauling experience preferred but not required</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Typing Indicator */}
                  <div className="flex justify-start mt-4">
                    <div className="bg-muted/40 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-gradient-primary rounded-full opacity-30 animate-pulse"></div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-gradient-hero rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Everything you need for modern recruiting
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Streamline your recruitment process with AI-powered tools designed specifically for the transportation industry.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* Pricing Teaser Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-muted/30 to-primary/5">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="mb-6">Ready to transform your recruiting?</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed">
            Choose the plan that fits your team size and needs. Start recruiting smarter today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-primary hover:shadow-glow transition-all duration-300 group">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
            </div>
            
            <div className="flex space-x-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-medium">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Demo Tab */}
      <DemoTab />
    </div>
  );
};

export default Landing;