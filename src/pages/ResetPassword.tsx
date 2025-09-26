import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, CheckCircle } from "lucide-react";
import { ImageLogo } from "@/components/ImageLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";
import type { AuthChangeEvent } from "@supabase/supabase-js";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const authListenerRef = useRef<{ data: { subscription: { unsubscribe: () => void } } } | null>(null);
  const hashProcessedRef = useRef(false);

  useEffect(() => {
    const clearUrlHash = () => {
      if (window.location.hash && !hashProcessedRef.current) {
        // Clear the hash to prevent reuse, but don't trigger a navigation event
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        hashProcessedRef.current = true;
      }
    };

    const checkRecoverySession = async () => {
      try {
        // Parse recovery parameters from URL hash (Supabase delivers tokens in hash, not search)
        const hash = window.location.hash;
        if (!hash) {
          toast({
            title: "Invalid reset link",
            description: "This page can only be accessed through a password reset email link.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/forgot-password'), 3000);
          return;
        }

        // Parse hash parameters (strip the leading '#')
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (type !== 'recovery' || !accessToken || !refreshToken) {
          toast({
            title: "Invalid reset link",
            description: "This password reset link is malformed. Please request a new one.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/forgot-password'), 3000);
          return;
        }

        // Set up auth state change listener to detect PASSWORD_RECOVERY event
        const authListener = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            // Double-check we have a valid session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData.session && !sessionError) {
              // Optionally verify user identity
              const { data: userData, error: userError } = await supabase.auth.getUser();
              
              if (userData.user && !userError) {
                setIsValidSession(true);
                clearUrlHash();
              } else {
                console.error('Failed to verify user identity:', userError);
                toast({
                  title: "Session verification failed",
                  description: "Unable to verify your identity. Please request a new password reset link.",
                  variant: "destructive",
                });
                setTimeout(() => navigate('/forgot-password'), 3000);
              }
            } else {
              console.error('Invalid session after PASSWORD_RECOVERY:', sessionError);
              toast({
                title: "Invalid session",
                description: "Your reset session is invalid. Please request a new password reset link.",
                variant: "destructive",
              });
              setTimeout(() => navigate('/forgot-password'), 3000);
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Session refreshed successfully, check if it's still valid
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              setIsValidSession(true);
            }
          }
        });
        authListenerRef.current = authListener;

        // Set the session from recovery parameters
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (setSessionError) {
          console.error('Failed to set session from recovery tokens:', setSessionError);
          toast({
            title: "Invalid or expired link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/forgot-password'), 3000);
          return;
        }

        // Verify the session is actually valid
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // Hardened session validation: require non-null session (no "|| !error" check)
        if (sessionData.session && !sessionError) {
          // Additional verification with getUser()
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userData.user && !userError) {
            setIsValidSession(true);
            clearUrlHash();
          } else {
            console.error('Failed to verify user:', userError);
            toast({
              title: "Session verification failed",
              description: "Unable to verify your identity. Please request a new password reset link.",
              variant: "destructive",
            });
            setTimeout(() => navigate('/forgot-password'), 3000);
          }
        } else {
          console.error('Invalid recovery session:', sessionError);
          toast({
            title: "Invalid or expired link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/forgot-password'), 3000);
        }
      } catch (error) {
        logError(error as Error, 'error', 'ResetPassword.checkRecoverySession');
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again or request a new reset link.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/forgot-password'), 3000);
      } finally {
        setCheckingSession(false);
      }
    };

    checkRecoverySession();

    // Cleanup function to unsubscribe from auth listener
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.data.subscription.unsubscribe();
      }
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pre-submission validation
    if (!password || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Validate we still have a valid recovery session before updating password
    if (!isValidSession) {
      toast({
        title: "Session expired",
        description: "Your password reset session has expired. Please request a new password reset link.",
        variant: "destructive",
      });
      setTimeout(() => navigate('/forgot-password'), 2000);
      return;
    }

    setLoading(true);
    
    try {
      // Double-check session validity before password update
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionData.session || sessionError) {
        toast({
          title: "Session invalid",
          description: "Your reset session is no longer valid. Please request a new password reset link.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/forgot-password'), 2000);
        return;
      }

      // Verify user identity one more time
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (!userData.user || userError) {
        toast({
          title: "Authentication failed",
          description: "Unable to verify your identity. Please request a new password reset link.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/forgot-password'), 2000);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        logError(updateError, 'error', 'ResetPassword.updatePassword');
        
        // Provide user-friendly error messages without leaking sensitive details
        let errorMessage = "Unable to update your password. Please try again.";
        
        if (updateError.message?.toLowerCase().includes('weak') || 
            updateError.message?.toLowerCase().includes('password')) {
          errorMessage = "Your password doesn't meet the security requirements. Please choose a stronger password.";
        } else if (updateError.message?.toLowerCase().includes('session') || 
                   updateError.message?.toLowerCase().includes('token')) {
          errorMessage = "Your reset session has expired. Please request a new password reset link.";
          setTimeout(() => navigate('/forgot-password'), 2000);
        } else if (updateError.message?.toLowerCase().includes('rate') || 
                   updateError.message?.toLowerCase().includes('limit')) {
          errorMessage = "Too many password reset attempts. Please wait a few minutes and try again.";
        }

        toast({
          title: "Password update failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Password update successful - clear any pending error redirects
        
        setIsSuccess(true);
        toast({
          title: "Password updated successfully",
          description: "Your password has been updated. You can now sign in with your new password.",
          variant: "default",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      logError(error as Error, 'error', 'ResetPassword.updatePassword');
      
      // Generic error message that doesn't leak sensitive information
      toast({
        title: "Update failed",
        description: "An unexpected error occurred while updating your password. Please try again or request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
              </div>
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <CardDescription>
                Verifying reset link...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
              </div>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600" data-testid="text-success-title">
                Password Updated Successfully
              </CardTitle>
              <CardDescription data-testid="text-success-description">
                Your password has been updated. You will be redirected to the login page shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Link 
                  to="/login" 
                  className="text-primary hover:underline text-sm"
                  data-testid="link-go-to-login"
                >
                  Go to Login Now
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-6">
                <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
              </div>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please request a new password reset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-primary hover:underline text-sm"
                  data-testid="link-request-new-reset"
                >
                  Request New Password Reset
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
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below to complete the reset process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
                data-testid="button-update-password"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
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

export default ResetPassword;