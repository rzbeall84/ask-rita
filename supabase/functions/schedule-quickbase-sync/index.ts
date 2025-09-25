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

  // SECURITY: Only allow service role access - this is an internal scheduled function
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
    console.log("Starting scheduled Quickbase sync for all active integrations...");

    // Get all active Quickbase integrations
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from('org_integrations')
      .select('*')
      .eq('provider', 'quickbase')
      .eq('is_active', true);

    if (integrationsError) {
      throw integrationsError;
    }

    if (!integrations || integrations.length === 0) {
      console.log("No active Quickbase integrations found");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No active integrations to sync",
          synced: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${integrations.length} active integrations to sync`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each integration
    for (const integration of integrations) {
      try {
        console.log(`Syncing integration ${integration.id} for org ${integration.org_id}`);

        // Call the sync function
        const syncResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-quickbase-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integrationId: integration.id,
            orgId: integration.org_id
          }),
        });

        const syncResult = await syncResponse.json();

        if (syncResult.success) {
          successCount++;
          results.push({
            integrationId: integration.id,
            orgId: integration.org_id,
            status: 'success',
            message: syncResult.message
          });
        } else {
          errorCount++;
          results.push({
            integrationId: integration.id,
            orgId: integration.org_id,
            status: 'error',
            message: syncResult.message
          });

          // Send error notification email
          await sendSyncErrorEmail(supabaseClient, integration, syncResult.message);
        }

      } catch (syncError: any) {
        console.error(`Error syncing integration ${integration.id}:`, syncError);
        errorCount++;
        results.push({
          integrationId: integration.id,
          orgId: integration.org_id,
          status: 'error',
          message: syncError.message
        });

        // Send error notification email
        await sendSyncErrorEmail(supabaseClient, integration, syncError.message);
      }
    }

    console.log(`Scheduled sync completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Scheduled sync completed: ${successCount} successful, ${errorCount} failed`,
        total: integrations.length,
        successful: successCount,
        failed: errorCount,
        results: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in scheduled sync:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Scheduled sync failed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function sendSyncErrorEmail(supabaseClient: any, integration: any, errorMessage: string) {
  try {
    // Get organization admin email
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select(`
        name,
        profiles!inner(
          user_id,
          role,
          first_name,
          last_name
        )
      `)
      .eq('id', integration.org_id)
      .eq('profiles.role', 'admin')
      .limit(1)
      .single();

    if (orgError || !org) {
      console.warn(`Could not find organization admin for ${integration.org_id}`);
      return;
    }

    // Get user email from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(org.profiles.user_id);
    
    if (userError || !user?.email) {
      console.warn(`Could not find user email for ${org.profiles.user_id}`);
      return;
    }

    // Send email notification
    const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        subject: `Quickbase Sync Failed - ${org.name}`,
        template: 'quickbase_sync_error',
        data: {
          organizationName: org.name,
          adminName: `${org.profiles.first_name} ${org.profiles.last_name}`,
          errorMessage: errorMessage,
          realmHostname: integration.meta?.realm_hostname,
          appId: integration.meta?.app_id,
          dashboardUrl: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/organization/settings?tab=integrations`
        }
      }),
    });

    if (emailResponse.ok) {
      console.log(`Sync error notification sent to ${user.email}`);
    } else {
      console.warn(`Failed to send sync error notification to ${user.email}`);
    }

  } catch (emailError: any) {
    console.error('Error sending sync error email:', emailError);
  }
}