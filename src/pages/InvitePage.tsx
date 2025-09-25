import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle,
  CheckCircle,
  Users,
  Shield,
  Loader2,
  User,
  Mail,
  Lock,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageLogo } from "@/components/ImageLogo";

interface OrganizationInfo {
  id: string;
  name: string;
  logoUrl?: string;
  hasSpace: boolean;
  currentUserCount: number;
  userLimit: number;
}

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    validateInviteToken();
  }, [token]);

  const validateInviteToken = async () => {
    if (!token) {
      setErrorMessage("Invalid invite link");
      setIsValid(false);
      setLoading(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke("validate-invite", {
        body: { token }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.valid) {
        setIsValid(true);
        setOrganization(data.organization);
        
        if (!data.hasSpace) {
          setErrorMessage("This organization has reached its user limit. Please contact the organization administrator.");
        }
      } else {
        setIsValid(false);
        setErrorMessage(data.error || "Invalid or expired invite link");
      }
    } catch (error: any) {
      console.error("Error validating invite:", error);
      setIsValid(false);
      setErrorMessage("Failed to validate invite link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingUser = async () => {
    if (!email) return;
    
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const exists = data?.users?.some(user => user.email === email);
      setIsExistingUser(exists || false);
    } catch (error) {
      // If we can't check, assume it's a new user
      setIsExistingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isExistingUser && password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!isExistingUser && password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke("join-organization", {
        body: {
          token,
          email,
          password: isExistingUser ? undefined : password,
          firstName,
          lastName,
          phoneNumber
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });

        // If it's a new user, try to sign them in automatically
        if (data.isNewUser) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (!signInError) {
            navigate("/dashboard");
          } else {
            navigate("/login");
          }
        } else {
          // Existing user needs to sign in
          navigate("/login");
        }
      } else {
        throw new Error(data.error || "Failed to join organization");
      }
    } catch (error: any) {
      console.error("Error joining organization:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join organization. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Validating invite link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Invite Link</CardTitle>
            <CardDescription className="text-base mt-2">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              This invite link may have expired or is no longer valid. 
              Please contact your organization administrator for a new invite.
            </p>
            <Button 
              onClick={() => navigate("/")}
              className="w-full"
              variant="outline"
            >
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
        {/* Organization Info Card */}
        <Card className="flex-1 lg:max-w-md">
          <CardHeader className="text-center pb-4">
            {organization?.logoUrl ? (
              <img 
                src={organization.logoUrl} 
                alt={organization?.name}
                className="w-24 h-24 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="mx-auto mb-4">
                <ImageLogo className="h-24 w-auto" />
              </div>
            )}
            <CardTitle className="text-2xl font-bold">
              You're Invited to Join
            </CardTitle>
            <div className="mt-3">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {organization?.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Team Size:</strong> {organization?.currentUserCount} members
                {organization?.userLimit && (
                  <span className="text-muted-foreground">
                    {" "}(Limit: {organization.userLimit})
                  </span>
                )}
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next?</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-green-600" />
                    <span>Create your account or sign in</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-green-600" />
                    <span>Automatically join {organization?.name}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-green-600" />
                    <span>Access team resources and tools</span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {!organization?.hasSpace && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This organization has reached its user limit. 
                  Please contact the administrator.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sign Up Form */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {isExistingUser ? "Sign In to Join" : "Create Your Account"}
            </CardTitle>
            <CardDescription>
              {isExistingUser 
                ? "Sign in with your existing account to join this organization"
                : "Fill in your details to create an account and join this organization"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="pl-10"
                      disabled={submitting || !organization?.hasSpace}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="pl-10"
                      disabled={submitting || !organization?.hasSpace}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={checkExistingUser}
                    required
                    className="pl-10"
                    disabled={submitting || !organization?.hasSpace}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    disabled={submitting || !organization?.hasSpace}
                  />
                </div>
              </div>

              {!isExistingUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10"
                        disabled={submitting || !organization?.hasSpace}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters long
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10"
                        disabled={submitting || !organization?.hasSpace}
                      />
                    </div>
                  </div>
                </>
              )}

              {isExistingUser && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    An account with this email already exists. 
                    You'll be added to {organization?.name} after verification.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow"
                disabled={submitting || !organization?.hasSpace}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    {isExistingUser ? "Join Organization" : "Create Account & Join"}
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvitePage;