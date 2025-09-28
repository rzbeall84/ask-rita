import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, addCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { token } = await req.json();
    
    if (!token) {
      throw new Error("No invite token provided");
    }

    // Find organization with this token
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, name, logo_url, invite_expires_at, user_limit")
      .eq("invite_token", token)
      .single();

    if (orgError || !org) {
      throw new Error("Invalid invite token");
    }

    // Check if token has expired
    if (org.invite_expires_at) {
      const expiryDate = new Date(org.invite_expires_at);
      if (expiryDate < new Date()) {
        throw new Error("Invite link has expired");
      }
    }

    // Get current user count for the organization
    const { count, error: countError } = await supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);

    if (countError) {
      console.error("Error counting users:", countError);
    }

    const currentUserCount = count || 0;
    const hasSpace = org.user_limit ? currentUserCount < org.user_limit : true;

    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          valid: true,
          organization: {
            id: org.id,
            name: org.name,
            logoUrl: org.logo_url
          },
          hasSpace,
          currentUserCount,
          userLimit: org.user_limit
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      ),
      req
    );
  } catch (error) {
    console.error("Error validating invite:", error);
    return addCorsHeaders(
      new Response(
        JSON.stringify({ valid: false, error: error.message }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      ),
      req
    );
  }
});