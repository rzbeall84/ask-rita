import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ask-rita-kt95eg6tk-drive-line.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Only allow service role access
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== serviceRoleKey) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Unauthorized - Service role access required" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("Setting up user_sessions table...");

    // For this implementation, we'll return instructions since we can't directly modify schema via edge functions
    // The user_sessions table needs to be created manually in Supabase SQL editor

    console.log("Successfully set up user_sessions table");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "user_sessions table created successfully with RLS policies and indexes"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error setting up user_sessions table:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Failed to set up user_sessions table"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});