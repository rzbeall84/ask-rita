import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { ImageLogo } from "@/components/ImageLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const establishRecoverySession = async () => {
      try {
        const url = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for recovery parameters (code or access_token)
        const code = urlParams.get('code') || hashParams.get('code');
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (code || (accessToken && type === 'recovery')) {
          console.log('Recovery parameters found, establishing session...');
          
          // First try code exchange (PKCE)
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) {
              console.error('Code exchange failed:', error);
              throw error;
            }
            console.log('Session established via code exchange:', !!data.session);
          } 
          // Fallback to token-based session
          else if (accessToken) {
            const refreshToken = hashParams.get('refresh_token');
            if (refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (error) {
                console.error('Token session failed:', error);
                throw error;
              }
              console.log('Session established via token');
            }
          }
          
          // Clean up URL
          window.history.replaceState(null, '', window.location.pathname);
        }
        
        // Verify we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check failed:', sessionError);
          throw sessionError;
        }
        
        if (!session) {
          console.warn('No valid session found after recovery attempt');
          setError("This password reset link is invalid or expired. Please request a new one.");
          setTimeout(() => navigate('/forgot-password'), 3000);
        } else {
          console.log('Valid session confirmed, showing form');
          setShowForm(true);
        }
        
      } catch (error: any) {
        console.error('Recovery session error:', error);
        setError("Failed to validate reset link. Please request a new password reset.");
        setTimeout(() => navigate('/forgot-password'), 3000);
      } finally {
        setIsInitializing(false);
      }
    };

    establishRecoverySession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    
    try {
      console.log('Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update failed:', error);
        throw error;
      }

      console.log('Password updated successfully');
      setIsSuccess(true);
      toast({
        title: "Success!",
        description: "Your password has been updated.",
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Password update error:', error);
      
      if (error.message?.includes('session') || error.message?.includes('Invalid user')) {
        setError("Your reset session has expired. Please request a new password reset.");
        setTimeout(() => navigate('/forgot-password'), 3000);
      } else {
        setError(error.message || "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" />
              </div>
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <CardDescription>
                Validating password reset link...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" />
              </div>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Password Updated!
              </CardTitle>
              <CardDescription>
                Redirecting to login...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Link to="/login" className="text-primary hover:underline text-sm">
                  Go to Login Now
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state or form
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-6">
              <ImageLogo size="medium" />
            </div>
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>
              {showForm ? "Enter your new password below." : "Validating reset link..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            {showForm ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter new password (6+ characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            
            <div className="text-center">
              <Link 
                to="/forgot-password" 
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Request new reset link
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;