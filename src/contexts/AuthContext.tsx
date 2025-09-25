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
  organization_id: number;
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
  signUpAdmin: (email: string, password: string, firstName: string, lastName: string, adminCode: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getAuthHeaders: () => { [key: string]: string };
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

      setProfile({
        ...data,
        organization_id: Number(data.organization_id)
      });
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-session`, {
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-session`, {
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

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-session`, {
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
    // Temporary admin login for Rebecca (until Supabase Auth is fully configured)
    if (email === 'rebecca@drivelinesolutions.net' && password === '84Honeybun#59!') {
      try {
        // Create mock user and session for Rebecca
        const mockUser = {
          id: 'rebecca-admin-001',
          email: 'rebecca@drivelinesolutions.net',
          app_metadata: {},
          user_metadata: { first_name: 'Rebecca', last_name: 'Beall' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User;

        const mockSession = {
          access_token: 'admin-temp-token',
          refresh_token: 'admin-refresh',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: mockUser
        } as Session;

        setUser(mockUser);
        setSession(mockSession);
        
        // Fetch real profile from database
        await fetchProfile('rebecca-admin-001');

        toast({
          title: "Welcome back!",
          description: "Successfully signed in as admin",
        });

        return { error: null };
      } catch (error) {
        console.error('Admin login error:', error);
        toast({
          title: "Sign in failed",
          description: "Authentication failed",
          variant: "destructive",
        });
        return { error };
      }
    }

    // Use regular Supabase auth for all other users
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

  const signUpAdmin = async (email: string, password: string, firstName: string, lastName: string, adminCode: string) => {
    try {
      // Validate admin code
      if (adminCode !== "InGodWeTrust#0724") {
        toast({
          title: "Invalid admin code",
          description: "The admin code you entered is incorrect",
          variant: "destructive",
        });
        return { error: new Error("Invalid admin code") };
      }

      // Create Supabase auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        logError(error, 'error', 'AuthContext.signUpAdmin', { email });
        toast({
          title: "Admin signup failed",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user) {
        // Create profile with admin role directly in database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            organization_id: 1 // Default org for admins
          });

        if (profileError) {
          logError(profileError, 'error', 'AuthContext.signUpAdmin.createProfile', { email, userId: data.user.id });
          toast({
            title: "Profile creation failed",
            description: "Failed to create admin profile",
            variant: "destructive",
          });
          return { error: profileError };
        }
      }

      toast({
        title: "Admin account created!",
        description: "You can now sign in with your admin credentials",
      });
      
      return { error: null };
    } catch (error) {
      logError(error as Error, 'error', 'AuthContext.signUpAdmin', { email });
      const friendlyError = getUserFriendlyError(error);
      toast({
        title: "Admin signup failed",
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
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-session`, {
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

  // Helper function to get auth headers with session ID
  const getAuthHeaders = () => {
    const headers: { [key: string]: string } = {};
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    if (currentSessionId.current) {
      headers['x-session-id'] = currentSessionId.current;
    }
    
    return headers;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signUpAdmin,
    signOut,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};