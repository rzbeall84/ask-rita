import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withRateLimit } from "../_shared/rateLimiter.ts";
import { handleCors, addCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Rate limiting for admin creation - very restrictive
  const rateLimitResponse = await withRateLimit(
    req,
    {
      maxRequests: 3, // Only 3 attempts per hour
      windowMs: 60 * 60 * 1000, // 1 hour window
      keyPrefix: 'admin:creation',
    },
    (req) => {
      // Rate limit by IP to prevent brute force
      const clientIP = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
      return clientIP;
    }
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { email, password, firstName, lastName, adminCode } = await req.json();
    
    if (!email || !password || !firstName || !lastName || !adminCode) {
      throw new Error("All fields are required");
    }

    // Validate admin code server-side - SECURE
    const validAdminCode = Deno.env.get("ADMIN_CREATION_CODE");
    if (!validAdminCode || adminCode !== validAdminCode) {
      console.log("Invalid admin code attempt:", { email, timestamp: new Date().toISOString() });
      throw new Error("Invalid admin code");
    }

    // Create admin user directly and handle duplicate errors
    const { data: newUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm admin users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin' // Set in metadata as well
      }
    });

    if (signUpError) {
      // Handle duplicate user error specifically
      if (signUpError.message?.includes('email') && 
          (signUpError.message?.includes('already') || signUpError.message?.includes('exists'))) {
        throw new Error("User with this email already exists");
      }
      console.error("Failed to create admin user:", signUpError);
      throw new Error(`Failed to create admin user: ${signUpError.message}`);
    }
    
    const userId = newUser.user.id;

    // Find or create default admin organization by name
    const { data: adminOrg, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id")
      .eq("name", "Admin Organization")
      .single();

    let adminOrgId: string;
    
    if (orgError || !adminOrg) {
      // Create default admin organization if it doesn't exist
      const { data: newOrg, error: createOrgError } = await supabaseClient
        .from("organizations")
        .insert({
          name: "Admin Organization",
          owner_id: userId,
          is_demo: false,
          monthly_query_cap: 999999
        })
        .select("id")
        .single();

      if (createOrgError) {
        console.error("Failed to create admin organization:", createOrgError);
        throw new Error("Failed to create admin organization");
      }
      adminOrgId = newOrg.id;
    } else {
      adminOrgId = adminOrg.id;
    }

    // Create admin profile with service role privileges - SECURE
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        organization_id: adminOrgId,
        role: "admin", // Only service role can set this
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("Failed to create admin profile:", profileError);
      throw new Error(`Failed to create admin profile: ${profileError.message}`);
    }

    // Log admin creation for audit
    await supabaseClient
      .from("error_logs")
      .insert({
        level: "info",
        message: "Admin user created successfully",
        context: JSON.stringify({ 
          email, 
          userId, 
          organizationId: adminOrgId,
          timestamp: new Date().toISOString() 
        }),
        function_name: "create-admin-user"
      });

    const successResponse = new Response(
      JSON.stringify({ 
        success: true,
        message: "Admin account created successfully",
        userId: userId
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
    
    return addCorsHeaders(successResponse, req);
  } catch (error) {
    console.error("Error creating admin user:", error);
    
    // Log error for audit
    await supabaseClient
      .from("error_logs")
      .insert({
        level: "error",
        message: "Admin user creation failed",
        context: JSON.stringify({ 
          error: error.message,
          timestamp: new Date().toISOString() 
        }),
        function_name: "create-admin-user"
      });

    const errorResponse = new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
    
    return addCorsHeaders(errorResponse, req);
  }
});