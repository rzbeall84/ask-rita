// @ts-ignore - Deno module imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno module imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, addCorsHeaders } from "../_shared/cors.ts";

// Deno global type declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface SessionRequest {
  action: 'create' | 'update' | 'validate' | 'cleanup';
  sessionId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Require user authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: false, 
          message: "Authentication required" 
        }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      ),
      req
    );
  }

  const supabaseClient = createClient(
    (Deno as any).env.get("SUPABASE_URL") ?? "",
    (Deno as any).env.get("SUPABASE_ANON_KEY") ?? "",
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
    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid authentication" 
        }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      ),
      req
    );
  }

  try {
    const { action, sessionId }: SessionRequest = await req.json();
    
    // Extract IP and user agent from request headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    switch (action) {
      case 'create':
        return await handleCreateSession(supabaseClient, user.id, sessionId!, req, userAgent, ipAddress);
      
      case 'update':
        return await handleUpdateSession(supabaseClient, user.id, sessionId!, req);
      
      case 'validate':
        return await handleValidateSession(supabaseClient, user.id, sessionId!, req);
      
      case 'cleanup':
        return await handleCleanupSessions(supabaseClient, user.id, req);
      
      default:
        return addCorsHeaders(
          new Response(
            JSON.stringify({ 
              success: false, 
              message: "Invalid action" 
            }),
            { headers: { "Content-Type": "application/json" }, status: 400 }
          ),
          req
        );
    }

  } catch (error: any) {
    console.error("Error in manage-user-session:", error);
    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: false,
          message: error.message || "Internal server error"
        }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      ),
      req
    );
  }
});

async function handleCreateSession(
  supabaseClient: any, 
  userId: string, 
  sessionId: string, 
  req: Request,
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

  return addCorsHeaders(
    new Response(
      JSON.stringify({ 
        success: true, 
        session: data,
        message: "Session created successfully"
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    ),
    req
  );
}

async function handleUpdateSession(supabaseClient: any, userId: string, sessionId: string, req: Request) {
  const { error } = await supabaseClient
    .from('user_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return addCorsHeaders(
    new Response(
      JSON.stringify({ 
        success: true, 
        message: "Session updated successfully"
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    ),
    req
  );
}

async function handleValidateSession(supabaseClient: any, userId: string, sessionId: string, req: Request) {
  const { data: session, error } = await supabaseClient
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single();

  if (error || !session) {
    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: false, 
          valid: false,
          message: "Session not found"
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      ),
      req
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

    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: false, 
          valid: false,
          message: "Session expired"
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      ),
      req
    );
  }

  return addCorsHeaders(
    new Response(
      JSON.stringify({ 
        success: true, 
        valid: true,
        session: session,
        message: "Session is valid"
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    ),
    req
  );
}

async function handleCleanupSessions(supabaseClient: any, userId: string, req: Request) {
  // Delete ALL sessions for this user (this is called on logout)
  const { error } = await supabaseClient
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to cleanup sessions: ${error.message}`);
  }

  return addCorsHeaders(
    new Response(
      JSON.stringify({ 
        success: true, 
        message: "All user sessions cleaned up successfully"
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    ),
    req
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
            // Get admin email from auth.users
            const { data: authUser } = await supabaseClient.auth.admin.getUserById(adminProfile.user_id);
            
            if (authUser?.user?.email) {
              // Send suspicious login email via edge function
              await fetch(`${(Deno as any).env.get("SUPABASE_URL")}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${(Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'suspicious_login',
                  data: {
                    adminName: `${adminProfile.first_name} ${adminProfile.last_name}`,
                    userName: `${profile.first_name} ${profile.last_name}`,
                    newIP: ipAddress,
                    userAgent: userAgent,
                    email: authUser.user.email
                  }
                }),
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking suspicious login:", error);
    // Don't throw error - this is optional functionality
  }
}