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

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseClient = createClient(
    (Deno as any).env.get("SUPABASE_URL") ?? "",
    (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { token, email, password, firstName, lastName, phoneNumber } = await req.json();
    
    if (!token || !email) {
      throw new Error("Token and email are required");
    }

    // Validate the invite token
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, name, invite_expires_at, user_limit")
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

    // Check user limit
    const { count: userCount } = await supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);

    if (org.user_limit && userCount >= org.user_limit) {
      throw new Error("Organization has reached its user limit");
    }

    // Check if user already exists
    const { data: authData } = await supabaseClient.auth.admin.listUsers();
    const existingUser = authData?.users?.find(u => u.email === email);

    let userId: string;
    
    if (existingUser) {
      // User exists, check if they're already in an organization
      const { data: existingProfile } = await supabaseClient
        .from("profiles")
        .select("organization_id")
        .eq("user_id", existingUser.id)
        .single();

      if (existingProfile?.organization_id) {
        throw new Error("User is already part of another organization");
      }

      userId = existingUser.id;
      
      // Create or update profile for existing user
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .upsert({
          user_id: userId,
          first_name: firstName || existingProfile?.first_name,
          last_name: lastName || existingProfile?.last_name,
          phone_number: phoneNumber || existingProfile?.phone_number,
          organization_id: org.id,
          role: "user",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);
      
    } else {
      // Create new user
      if (!password || !firstName || !lastName) {
        throw new Error("Password, first name, and last name are required for new users");
      }

      const { data: newUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (signUpError) throw new Error(`Failed to create user: ${signUpError.message}`);
      
      userId = newUser.user.id;

      // Create profile for new user
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          organization_id: org.id,
          role: "user"
        });

      if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Mark the invite token as used (optional - you might want to keep it for multiple uses)
    // Uncomment if you want single-use tokens:
    /*
    await supabaseClient.rpc("use_invite_token", { token });
    */

    return addCorsHeaders(
      new Response(
        JSON.stringify({ 
          success: true,
          message: existingUser ? "Successfully joined organization" : "Account created and joined organization",
          organizationName: org.name,
          isNewUser: !existingUser
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      ),
      req
    );
  } catch (error) {
    console.error("Error joining organization:", error);
    return addCorsHeaders(
      new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      ),
      req
    );
  }
});