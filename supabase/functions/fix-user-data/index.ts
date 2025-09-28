// @ts-ignore - Deno runtime imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno runtime imports  
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Declare Deno for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// CORS handler
function handleCors(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  return null;
}

function addCorsHeaders(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  return response;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    // Only allow fixing specific email for security
    if (email !== "rebecca@drivelinesolutions.net") {
      throw new Error("This utility is only for fixing rebecca@drivelinesolutions.net");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find the existing user
    let existingUser: any = null;
    let page = 1;
    const perPage = 1000;
    
    // Search through all pages to find the user
    while (!existingUser) {
      const { data: userPage, error: listError } = await supabaseClient.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });
      
      if (listError) {
        console.error("Failed to list users:", listError);
        throw new Error("Cannot retrieve user details");
      }
      
      existingUser = userPage.users.find(u => u.email === email);
      
      // If we found the user or there are no more pages, break
      if (existingUser || userPage.users.length < perPage) {
        break;
      }
      
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.error("Exceeded pagination limit searching for user:", email);
        break;
      }
    }
    
    if (!existingUser) {
      throw new Error("User not found in auth system");
    }

    const userId = existingUser.id;
    console.log("Found existing user:", { email, userId });

    // Find or create organization for DriveLine Solutions
    let organization;
    
    const { data: existingOrg, error: orgFindError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('name', 'DriveLine Solutions')
      .single();

    if (existingOrg && !orgFindError) {
      organization = existingOrg;
      console.log("Using existing organization:", organization.id);
    } else {
      // Create new organization
      const { data: newOrg, error: orgCreateError } = await supabaseClient
        .from('organizations')
        .insert({
          name: 'DriveLine Solutions',
          owner_id: userId,
          subscription_status: 'active',
          monthly_query_cap: null // unlimited
        })
        .select()
        .single();

      if (orgCreateError) {
        console.error("Failed to create organization:", orgCreateError);
        throw new Error(`Failed to create organization: ${orgCreateError.message}`);
      }
      
      organization = newOrg;
      console.log("Created new organization:", organization.id);
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: userId,
          first_name: 'Rebecca',
          last_name: 'DriveLine',
          organization_id: organization.id,
          role: 'admin'
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      console.log("Created profile for user");
    } else {
      console.log("Profile already exists for user");
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingSubscription) {
      // Create subscription with unlimited access
      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: userId,
          organization_id: organization.id,
          status: 'active',
          plan_type: 'enterprise',
          unlimited_usage: true,
          query_limit: null,
          storage_limit_gb: null
        });

      if (subscriptionError) {
        console.error("Failed to create subscription:", subscriptionError);
        throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
      }
      
      console.log("Created subscription for user");
    } else {
      console.log("Subscription already exists for user");
    }

    return addCorsHeaders(
      new Response(JSON.stringify({ 
        success: true, 
        message: "User data setup completed successfully",
        userId: userId,
        organizationId: organization.id
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("ERROR in fix-user-data:", errorMessage);
    return addCorsHeaders(
      new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    );
  }
});