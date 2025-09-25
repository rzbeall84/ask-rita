import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface SessionValidationResult {
  valid: boolean;
  user?: any;
  message?: string;
}

/**
 * Validates that a user has an active session
 * @param req - The request object to extract headers from
 * @returns SessionValidationResult with validation status and user data
 */
export async function validateUserSession(req: Request): Promise<SessionValidationResult> {
  try {
    // Extract authorization header and session ID
    const authHeader = req.headers.get("Authorization");
    const sessionId = req.headers.get("x-session-id");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { valid: false, message: "Missing or invalid authorization header" };
    }

    if (!sessionId) {
      return { valid: false, message: "Missing session ID header" };
    }

    // Create Supabase client with service role for session validation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user authentication with the provided token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return { valid: false, message: "Invalid authentication token" };
    }

    const user = userData.user;

    // Check if user has a valid session in our tracking
    const { data: session, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('id, last_seen, created_at')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return { valid: false, message: "Invalid or expired session" };
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

      return { valid: false, message: "Session expired" };
    }

    // Update last_seen timestamp for valid sessions
    await supabaseClient
      .from('user_sessions')
      .update({ last_seen: now.toISOString() })
      .eq('id', session.id);

    return { valid: true, user };

  } catch (error) {
    console.error("Session validation error:", error);
    return { valid: false, message: "Session validation failed" };
  }
}

/**
 * Returns a standardized 401 response for invalid sessions
 * @param message - Error message to include
 * @param corsHeaders - CORS headers to include
 * @returns Response object with 401 status
 */
export function createSessionInvalidResponse(message: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "INVALID_SESSION",
      message 
    }),
    { 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      }, 
      status: 401 
    }
  );
}