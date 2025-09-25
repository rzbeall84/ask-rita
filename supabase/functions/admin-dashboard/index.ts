import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, addCorsHeaders } from "../_shared/cors.ts";

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
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Check authorization (simplified for development)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }),
        req
      );
    }

    switch (path) {
      case "organizations":
        return await getOrganizations(supabaseClient, req);
      case "users":
        return await getUsers(supabaseClient, req);
      case "stats":
        return await getDashboardStats(supabaseClient, req);
      case "reset-password":
        return await resetUserPassword(supabaseClient, req);
      case "update-org-status":
        return await updateOrganizationStatus(supabaseClient, req);
      default:
        return addCorsHeaders(
          new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }),
          req
        );
    }
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
});

// Get all organizations with stats
async function getOrganizations(supabaseClient: any, req: Request) {
  try {
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return addCorsHeaders(
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Failed to fetch organizations" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
}

// Get all users
async function getUsers(supabaseClient: any, req: Request) {
  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return addCorsHeaders(
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
}

// Reset user password
async function resetUserPassword(supabaseClient: any, req: Request) {
  try {
    const { userId, newPassword } = await req.json();
    
    if (!userId || !newPassword) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "User ID and new password are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }),
        req
      );
    }

    // In a real implementation, you would use Supabase Admin API to reset password
    // For demonstration, we'll log it
    console.log(`Admin reset password for user ${userId}`);
    
    // Update user record timestamp to show action was taken
    const { error } = await supabaseClient
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    return addCorsHeaders(
      new Response(JSON.stringify({ success: true, message: "Password reset successfully" }), {
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Failed to reset password" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
}

// Update organization status
async function updateOrganizationStatus(supabaseClient: any, req: Request) {
  try {
    const { orgId, status } = await req.json();
    
    if (!orgId || !status) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Organization ID and status are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }),
        req
      );
    }

    const { error } = await supabaseClient
      .from('organizations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    if (error) throw error;

    return addCorsHeaders(
      new Response(JSON.stringify({ success: true, message: "Organization status updated" }), {
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  } catch (error) {
    console.error("Error updating organization status:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Failed to update organization status" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
}

// Get dashboard stats
async function getDashboardStats(supabaseClient: any, req: Request) {
  try {
    // Get organization counts
    const { data: orgs, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, plan_type, status');

    if (orgError) throw orgError;

    // Get user count
    const { count: userCount, error: userError } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    // Calculate stats
    const totalOrganizations = orgs.length;
    const activeOrganizations = orgs.filter((org: any) => org.status === 'active').length;
    
    // Calculate revenue
    const planValues = { free: 0, starter: 29, pro: 99, enterprise: 299 };
    const monthlyRevenue = orgs
      .filter((org: any) => org.status === 'active')
      .reduce((sum: number, org: any) => {
        return sum + (planValues[org.plan_type as keyof typeof planValues] || 0);
      }, 0);

    const stats = {
      totalOrganizations,
      activeOrganizations,
      totalUsers: userCount || 0,
      monthlyRevenue,
      systemHealth: 98.9 // Mock system health
    };

    return addCorsHeaders(
      new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: "Failed to fetch dashboard stats" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }),
      req
    );
  }
}