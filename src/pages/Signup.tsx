import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, User, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Loader2, ChevronLeft, Zap, Check, Star, GraduationCap, Briefcase, Truck, UserCheck } from "lucide-react";
import { ImageLogo } from "@/components/ImageLogo";
import { FeatureCard } from "@/components/FeatureCard";

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

const Signup = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const selectedPlan = searchParams.get('plan');
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    promoCode: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(!!inviteToken);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check invite token validity and load user data
  useEffect(() => {
    if (inviteToken) {
      checkInviteToken();
    }
  }, [inviteToken]);

  const checkInviteToken = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('invite_token', inviteToken)
        .gt('invite_expires_at', new Date().toISOString())
        .is('auth_user_id', null)
        .maybeSingle();

      if (error) {
        console.error('Error checking invite token:', error);
        setInviteValid(false);
        return;
      }

      if (data) {
        setInviteData(data);
        setInviteValid(true);
        setFormData(prev => ({
          ...prev,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phoneNumber: data.phone_number || ""
        }));
        toast({
          title: "Invitation Valid",
          description: `Welcome! You've been invited to join AskRita.`,
        });
      } else {
        setInviteValid(false);
        toast({
          title: "Invalid Invitation",
          description: "This invitation link is not valid, has expired, or has already been used.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking invite token:', error);
      setInviteValid(false);
    } finally {
      setCheckingInvite(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (inviteToken && inviteValid !== true) {
      toast({
        title: "Invalid Invitation",
        description: "Your invitation link is no longer valid. Please request a new invitation.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phoneNumber,
            promo_code: formData.promoCode
          }
        }
      });

      if (error) {
        throw error;
      }

      // If there's an invite token, link the auth user to the app_users record
      if (inviteToken && inviteData && data.user) {
        const { error: updateError } = await supabase
          .from('app_users')
          .update({
            auth_user_id: data.user.id,
            status: 'active',
            invite_token: null,
            invite_expires_at: null
          })
          .eq('id', inviteData.id);

        if (updateError) {
          console.error('Error linking user to invitation:', updateError);
        }
        
        toast({
          title: "Welcome to AskRita!",
          description: "Your account has been created and linked successfully.",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "An error occurred during signup.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        <Card className="w-full bg-gradient-card border-0 shadow-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
          </div>
          <CardTitle className="text-3xl font-black text-foreground">Create Account</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {inviteToken ? "Complete your invited signup" : "Join AskRita to revolutionize your recruiting process"}
          </CardDescription>
          
          {/* Selected Plan Display */}
          {selectedPlan && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Selected Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                You'll be able to start your subscription after account creation
              </p>
            </div>
          )}
          
          {/* Invite Status Indicator */}
          {inviteToken && (
            <div className="mt-4">
              {checkingInvite ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-700 font-medium">Validating invitation...</span>
                </div>
              ) : inviteValid === true ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Valid invitation - Information pre-filled
                  </span>
                </div>
              ) : inviteValid === false ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Invalid or expired invitation
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  First Name
                </Label>
                <Input 
                  id="firstName" 
                  placeholder="John" 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  disabled={isLoading || (inviteToken && inviteValid === true)}
                  className="border-input/50 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold">
                  Last Name
                </Label>
                <Input 
                  id="lastName" 
                  placeholder="Doe" 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  disabled={isLoading || (inviteToken && inviteValid === true)}
                  className="border-input/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john.doe@company.com" 
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isLoading || (inviteToken && inviteValid === true)}
                className="border-input/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input 
                id="phoneNumber" 
                type="tel" 
                placeholder="+1-555-0123" 
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                disabled={isLoading}
                className="border-input/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promoCode" className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4" />
                Promo Code (Optional)
              </Label>
              <Input 
                id="promoCode" 
                type="text" 
                placeholder="Enter promo code" 
                value={formData.promoCode}
                onChange={(e) => handleInputChange("promoCode", e.target.value.toUpperCase())}
                disabled={isLoading}
                className="border-input/50 focus:border-primary"
              />
              {(formData.promoCode === "GEORGIAGRACE5908" || 
                formData.promoCode === "CHERICLAIRE5908" || 
                formData.promoCode === "INGODWETRUST#0724") && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>
                    {formData.promoCode === "GEORGIAGRACE5908" && "Valid promo code - Unlimited Starter tier access granted!"}
                    {formData.promoCode === "CHERICLAIRE5908" && "Valid promo code - Unlimited Pro tier access granted!"}
                    {formData.promoCode === "INGODWETRUST#0724" && "Valid promo code - Unlimited Enterprise tier access granted!"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password" 
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isLoading}
                  className="border-input/50 focus:border-primary pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password" 
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  disabled={isLoading}
                  className="border-input/50 focus:border-primary pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300" 
              size="lg"
              disabled={isLoading || (inviteToken && inviteValid !== true)}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
        </Card>


        {/* Features Cards Section */}
        <section className="mt-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Powerful features for modern recruiting
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Streamline your recruitment process with AI-powered tools designed for transportation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Signup;