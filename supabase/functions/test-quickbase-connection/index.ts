import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userToken, realmHostname, appId, tableId, integrationId } = await req.json();
    
    let actualUserToken = userToken;
    
    // If integrationId is provided, get and decrypt the stored token
    if (integrationId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { data: integration, error: integrationError } = await supabaseClient
        .from('org_integrations')
        .select('api_key')
        .eq('id', integrationId)
        .single();

      if (integrationError || !integration) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Integration not found" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Decrypt the stored token
      const decryptResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/encrypt-quickbase-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'decrypt',
          token: integration.api_key
        }),
      });

      const decryptResult = await decryptResponse.json();
      if (!decryptResult.success) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to decrypt stored token" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      actualUserToken = decryptResult.result;
    }

    if (!actualUserToken || !realmHostname || !appId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: userToken, realmHostname, appId" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate realm hostname format
    if (!realmHostname.includes('.quickbase.com')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid realm hostname. Must be in format: yourcompany.quickbase.com" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Test connection by fetching app info
    const appInfoUrl = `https://api.quickbase.com/v1/apps/${appId}`;
    
    console.log(`Testing connection to Quickbase app: ${appId} on realm: ${realmHostname}`);

    const appResponse = await fetch(appInfoUrl, {
      method: 'GET',
      headers: {
        'QB-Realm-Hostname': realmHostname,
        'User-Agent': 'AskRita-App',
        'Authorization': `QB-USER-TOKEN ${actualUserToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!appResponse.ok) {
      const errorText = await appResponse.text();
      console.error('Quickbase app info error:', errorText);
      
      if (appResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Invalid User Token or insufficient permissions" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else if (appResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Access denied. Check app permissions for this token" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else if (appResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "App not found. Verify the App ID is correct" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Quickbase API error: ${appResponse.status} ${appResponse.statusText}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    const appInfo = await appResponse.json();
    console.log('App info retrieved successfully:', appInfo.name);

    // If table ID is specified, test table access
    let tableInfo = null;
    if (tableId) {
      const tableUrl = `https://api.quickbase.com/v1/tables/${tableId}`;
      
      const tableResponse = await fetch(tableUrl, {
        method: 'GET',
        headers: {
          'QB-Realm-Hostname': realmHostname,
          'User-Agent': 'AskRita-App',
          'Authorization': `QB-USER-TOKEN ${actualUserToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!tableResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Table ${tableId} not found or no access. Verify the Table ID.` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      tableInfo = await tableResponse.json();
      console.log('Table info retrieved successfully:', tableInfo.name);
    }

    // Test a small query to ensure read access
    const queryUrl = `https://api.quickbase.com/v1/records/query`;
    const queryPayload = {
      from: tableId || appInfo.tables?.[0]?.id,
      select: [1], // Usually the Record ID field
      top: 1 // Just get one record to test
    };

    const queryResponse = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'QB-Realm-Hostname': realmHostname,
        'User-Agent': 'AskRita-App',
        'Authorization': `QB-USER-TOKEN ${actualUserToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryPayload)
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('Quickbase query test error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Connection successful but no read access to records. Check table permissions." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log('Query test successful - user has read access');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Connection successful",
        appInfo: {
          name: appInfo.name,
          id: appInfo.id,
          description: appInfo.description
        },
        tableInfo: tableInfo ? {
          name: tableInfo.name,
          id: tableInfo.id,
          description: tableInfo.description
        } : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error testing Quickbase connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Failed to test connection"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});