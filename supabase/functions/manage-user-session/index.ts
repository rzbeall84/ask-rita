import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ask-rita-kt95eg6tk-drive-line.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionRequest {
  action: 'create' | 'update' | 'validate' | 'cleanup';
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require user authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Authentication required" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );

  // Verify user authentication
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Invalid authentication" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  try {
    const { action, sessionId, userAgent, ipAddress }: SessionRequest = await req.json();

    switch (action) {
      case 'create':
        return await handleCreateSession(supabaseClient, user.id, sessionId!, userAgent, ipAddress);
      
      case 'update':
        return await handleUpdateSession(supabaseClient, user.id, sessionId!);
      
      case 'validate':
        return await handleValidateSession(supabaseClient, user.id, sessionId!);
      
      case 'cleanup':
        return await handleCleanupSessions(supabaseClient, user.id);
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Invalid action" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }

  } catch (error: any) {
    console.error("Error in manage-user-session:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Internal server error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function handleCreateSession(
  supabaseClient: any, 
  userId: string, 
  sessionId: string, 
  userAgent?: string, 
  ipAddress?: string
) {
  // First, terminate any existing sessions for this user
  const { error: deleteError } = await supabaseClient
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error("Error deleting existing sessions:", deleteError);
  }

  // Create new session
  const { data, error } = await supabaseClient
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  // Check if this login is from a suspicious location
  await checkSuspiciousLogin(supabaseClient, userId, ipAddress, userAgent);

  return new Response(
    JSON.stringify({ 
      success: true, 
      session: data,
      message: "Session created successfully"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

async function handleUpdateSession(supabaseClient: any, userId: string, sessionId: string) {
  const { error } = await supabaseClient
    .from('user_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Session updated successfully"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

async function handleValidateSession(supabaseClient: any, userId: string, sessionId: string) {
  const { data: session, error } = await supabaseClient
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single();

  if (error || !session) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        valid: false,
        message: "Session not found"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // Check if session is too old (24 hours)
  const lastSeen = new Date(session.last_seen);
  const now = new Date();
  const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastSeen > 24) {
    // Delete expired session
    await supabaseClient
      .from('user_sessions')
      .delete()
      .eq('id', session.id);

    return new Response(
      JSON.stringify({ 
        success: false, 
        valid: false,
        message: "Session expired"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      valid: true,
      session: session,
      message: "Session is valid"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

async function handleCleanupSessions(supabaseClient: any, userId: string) {
  // Clean up old sessions (older than 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabaseClient
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('last_seen', twentyFourHoursAgo);

  if (error) {
    throw new Error(`Failed to cleanup sessions: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Sessions cleaned up successfully"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}

async function checkSuspiciousLogin(
  supabaseClient: any, 
  userId: string, 
  ipAddress?: string, 
  userAgent?: string
) {
  if (!ipAddress) return;

  try {
    // Get user's recent login history (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSessions, error } = await supabaseClient
      .from('user_sessions')
      .select('ip_address, user_agent, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !recentSessions || recentSessions.length === 0) {
      return; // No recent history to compare
    }

    // Check if this IP is significantly different from recent IPs
    const recentIPs = recentSessions
      .map(s => s.ip_address)
      .filter(ip => ip && ip !== ipAddress);

    if (recentIPs.length > 0) {
      // Get user profile to find organization admin
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, organization_id')
        .eq('user_id', userId)
        .single();

      if (profile && profile.organization_id) {
        // Get organization admin
        const { data: orgOwner } = await supabaseClient
          .from('organizations')
          .select('owner_id')
          .eq('id', profile.organization_id)
          .single();

        if (orgOwner) {
          // Get admin profile
          const { data: adminProfile } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, user_id')
            .eq('user_id', orgOwner.owner_id)
            .single();

          if (adminProfile) {
            // Send suspicious login email via edge function
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'suspicious_login',
                data: {
                  adminName: `${adminProfile.first_name} ${adminProfile.last_name}`,
                  userName: `${profile.first_name} ${profile.last_name}`,
                  newIP: ipAddress,
                  userAgent: userAgent,
                  email: adminProfile.user_id // This should be email, but we'll use user_id for now
                }
              }),
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking suspicious login:", error);
    // Don't throw error - this is optional functionality
  }
}