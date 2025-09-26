import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ImageLogo } from "@/components/ImageLogo";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    
    // Always show success state to prevent account enumeration
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
            data-testid="link-back-to-login"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-success-title">Check your email</CardTitle>
              <CardDescription data-testid="text-success-description">
                If the email is registered, you'll receive a reset link shortly. 
                Check your email and follow the instructions to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Link 
                  to="/login" 
                  className="text-primary hover:underline text-sm"
                  data-testid="link-return-to-login"
                >
                  Return to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          data-testid="link-back-to-login"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-6">
              <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
            </div>
            <CardTitle className="text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
                data-testid="button-reset-password"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline" data-testid="link-back-to-signin">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;