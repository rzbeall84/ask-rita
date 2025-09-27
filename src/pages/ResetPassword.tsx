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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Simple approach: show form after 2 seconds and try to establish session in background
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 2000);

    // Try to establish session in background (non-blocking)
    const establishSession = async () => {
      try {
        const url = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const code = urlParams.get('code') || hashParams.get('code');
        const accessToken = hashParams.get('access_token');
        
        if (code) {
          await supabase.auth.exchangeCodeForSession(url);
        } else if (accessToken) {
          const refreshToken = hashParams.get('refresh_token');
          if (refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
        }
        
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
      } catch (error) {
        console.log('Background session setup failed, will try on submit');
      }
    };

    establishSession();
    return () => clearTimeout(timer);
  }, []);

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
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

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
      
      if (error.message?.includes('session') || error.message?.includes('Invalid user') || error.message?.includes('not authenticated')) {
        setError("Your reset link has expired or is invalid. Please request a new password reset.");
        setTimeout(() => navigate('/forgot-password'), 3000);
      } else {
        setError(error.message || "Failed to update password. Please try requesting a new reset link.");
      }
    } finally {
      setLoading(false);
    }
  };

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

  if (!showForm) {
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
                Loading password reset...
              </CardDescription>
            </CardHeader>
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
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
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