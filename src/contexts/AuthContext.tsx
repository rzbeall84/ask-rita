import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError, getUserFriendlyError } from '@/lib/errorHandler';

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  organization_id: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const currentSessionId = useRef<string | null>(null);
  const sessionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Session management functions
  const createUserSession = async (sessionId: string) => {
    try {
      // Get current session to pass user token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        console.error('No valid session for creating user session');
        return;
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/manage-user-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          sessionId
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Failed to create session:', result.message);
      } else {
        currentSessionId.current = sessionId;
        startSessionUpdates();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const validateUserSession = async (sessionId: string) => {
    try {
      // Get current session to pass user token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        return false;
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/manage-user-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate',
          sessionId
        }),
      });

      const result = await response.json();
      if (!result.success || !result.valid) {
        // Session is invalid, force logout
        console.warn('Session invalid, forcing logout:', result.message);
        await signOut();
        toast({
          title: "Session Expired",
          description: "You have been logged out due to an invalid session. Please sign in again.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  };

  const updateUserSession = async (sessionId: string) => {
    try {
      // Get current session to pass user token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        return;
      }

      await fetch(`${supabase.supabaseUrl}/functions/v1/manage-user-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          sessionId
        }),
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const startSessionUpdates = () => {
    // Update session every 5 minutes
    if (sessionUpdateInterval.current) {
      clearInterval(sessionUpdateInterval.current);
    }
    
    sessionUpdateInterval.current = setInterval(() => {
      if (currentSessionId.current) {
        updateUserSession(currentSessionId.current);
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  const stopSessionUpdates = () => {
    if (sessionUpdateInterval.current) {
      clearInterval(sessionUpdateInterval.current);
      sessionUpdateInterval.current = null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid potential deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);

          // Handle session management based on auth event
          if (event === 'SIGNED_IN') {
            // Create new session when user signs in - generate UUID instead of using access token
            const newSessionId = crypto.randomUUID();
            await createUserSession(newSessionId);
          } else if (event === 'TOKEN_REFRESHED') {
            // Validate existing session on token refresh
            if (currentSessionId.current) {
              await validateUserSession(currentSessionId.current);
            }
          }
        } else {
          setProfile(null);
          stopSessionUpdates();
          currentSessionId.current = null;
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);

        // For existing sessions, we need to check if user has active session in our tracking
        // For now, create a new session to ensure proper tracking
        const newSessionId = crypto.randomUUID();
        currentSessionId.current = newSessionId;
        await createUserSession(newSessionId);
      }
      
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      stopSessionUpdates();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed", 
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        logError(error, 'error', 'AuthContext.signUp', { email });
        toast({
          title: "Sign up failed",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
        return { error };
      }

      // Send welcome email
      if (data?.user) {
        try {
          const response = await fetch(`${window.location.origin}/api/send-welcome-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              firstName,
              organizationName: 'AskRita'
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to send welcome email');
          }
        } catch (emailError) {
          logError(emailError as Error, 'warning', 'AuthContext.sendWelcomeEmail');
        }
      }

      toast({
        title: "Check your email",
        description: "We sent you a confirmation link to complete your registration.",
      });
      
      return { error: null };
    } catch (error) {
      logError(error as Error, 'error', 'AuthContext.signUp', { email });
      const friendlyError = getUserFriendlyError(error);
      toast({
        title: "Sign up failed",
        description: friendlyError,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    // Clean up session tracking
    stopSessionUpdates();
    if (currentSessionId.current) {
      try {
        // Get current session to pass user token
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          await fetch(`${supabase.supabaseUrl}/functions/v1/manage-user-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'cleanup'
            }),
          });
        }
      } catch (error) {
        console.error('Error cleaning up session:', error);
      }
    }
    currentSessionId.current = null;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};