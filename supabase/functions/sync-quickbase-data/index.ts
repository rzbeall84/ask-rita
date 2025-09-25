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

  // SECURITY: Only allow service role access - this is an internal function
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
    const { integrationId } = await req.json();

    if (!integrationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required field: integrationId" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get integration details - SECURITY: derive orgId from integration, don't trust client
    const { data: integration, error: integrationError } = await supabaseClient
      .from('org_integrations')
      .select('*')
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

    const { api_key: encryptedToken, meta, org_id: orgId } = integration;
    const { realm_hostname, app_id, table_id } = meta;

    // Decrypt the token
    const decryptResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/encrypt-quickbase-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'decrypt',
        token: encryptedToken
      }),
    });

    const decryptResult = await decryptResponse.json();
    if (!decryptResult.success) {
      throw new Error('Failed to decrypt token');
    }

    const userToken = decryptResult.result;

    // Update sync status to indicate sync is starting
    await supabaseClient
      .from('org_integrations')
      .update({ 
        sync_status: 'pending',
        sync_error: null
      })
      .eq('id', integrationId);

    console.log(`Starting Quickbase sync for org ${orgId}, app ${app_id}`);

    try {
      // Get tables to sync (either specific table or all tables)
      let tablesToSync = [];
      
      if (table_id) {
        // Sync specific table
        tablesToSync = [{ id: table_id }];
      } else {
        // Get all tables in the app
        const appInfoUrl = `https://api.quickbase.com/v1/apps/${app_id}`;
        const appResponse = await fetch(appInfoUrl, {
          method: 'GET',
          headers: {
            'QB-Realm-Hostname': realm_hostname,
            'User-Agent': 'AskRita-App',
            'Authorization': `QB-USER-TOKEN ${userToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!appResponse.ok) {
          throw new Error(`Failed to get app info: ${appResponse.status}`);
        }

        const appInfo = await appResponse.json();
        tablesToSync = appInfo.tables || [];
      }

      let totalRecords = 0;
      let totalTables = 0;

      // Sync each table
      for (const table of tablesToSync) {
        try {
          console.log(`Syncing table ${table.id}`);
          
          // Get table schema first
          const tableUrl = `https://api.quickbase.com/v1/tables/${table.id}`;
          const tableResponse = await fetch(tableUrl, {
            method: 'GET',
            headers: {
              'QB-Realm-Hostname': realm_hostname,
              'User-Agent': 'AskRita-App',
              'Authorization': `QB-USER-TOKEN ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!tableResponse.ok) {
            console.warn(`Skipping table ${table.id}: ${tableResponse.status}`);
            continue;
          }

          const tableInfo = await tableResponse.json();
          
          // First get table schema to determine available fields
          const fieldsUrl = `https://api.quickbase.com/v1/tables/${table.id}/fields`;
          const fieldsResponse = await fetch(fieldsUrl, {
            method: 'GET',
            headers: {
              'QB-Realm-Hostname': realm_hostname,
              'User-Agent': 'AskRita-App',
              'Authorization': `QB-USER-TOKEN ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          let fieldIds = [3]; // Default to record ID if schema fetch fails
          let fieldMap: Record<number, string> = {};

          if (fieldsResponse.ok) {
            const fieldsData = await fieldsResponse.json();
            // Get meaningful text fields for better embeddings
            const meaningfulFields = fieldsData.filter((field: any) => 
              field.fieldType && 
              !field.mode?.includes('SYSTEM') &&
              ['TEXT', 'RICH_TEXT', 'MULTITEXT', 'EMAIL', 'URL', 'PHONE', 'NUMERIC', 'CURRENCY'].includes(field.fieldType)
            );
            
            if (meaningfulFields.length > 0) {
              fieldIds = meaningfulFields.map((field: any) => field.id);
              fieldMap = meaningfulFields.reduce((map: any, field: any) => {
                map[field.id] = field.label || `Field ${field.id}`;
                return map;
              }, {});
            }
          }

          // Get all records from the table
          const queryUrl = `https://api.quickbase.com/v1/records/query`;
          let skip = 0;
          const top = 1000; // Quickbase limit per request
          let hasMore = true;
          
          while (hasMore) {
            const queryPayload = {
              from: table.id,
              select: fieldIds,
              skip: skip,
              top: top
            };

            const queryResponse = await fetch(queryUrl, {
              method: 'POST',
              headers: {
                'QB-Realm-Hostname': realm_hostname,
                'User-Agent': 'AskRita-App',
                'Authorization': `QB-USER-TOKEN ${userToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(queryPayload)
            });

            if (!queryResponse.ok) {
              console.warn(`Failed to query table ${table.id}: ${queryResponse.status}`);
              break;
            }

            const queryResult = await queryResponse.json();
            const records = queryResult.data || [];
            
            if (records.length === 0) {
              hasMore = false;
              break;
            }

            // Process records and create content for embeddings
            for (const record of records) {
              // Properly extract field values from Quickbase record format
              const recordValues: string[] = [];
              const recordId = record[3]?.value || record[1]?.value || 'Unknown'; // Fallback record ID
              
              for (const fieldId of fieldIds) {
                const fieldData = record[fieldId];
                if (fieldData && fieldData.value !== null && fieldData.value !== undefined) {
                  const value = fieldData.value;
                  // Handle different data types properly
                  if (typeof value === 'string' || typeof value === 'number') {
                    recordValues.push(String(value));
                  } else if (Array.isArray(value)) {
                    recordValues.push(value.join(', '));
                  } else if (typeof value === 'object') {
                    // For complex objects, try to extract meaningful text
                    recordValues.push(JSON.stringify(value));
                  }
                }
              }
              
              const recordText = recordValues.filter(v => v.trim().length > 0).join(' | ');
              
              // Skip records with no meaningful content
              if (!recordText.trim()) continue;
              
              // Create deterministic unique key for upsert (prevents duplicates)
              const uniqueKey = `${orgId}-${table.id}-${recordId}`;
              
              // Store as document content for embeddings
              await supabaseClient
                .from('document_content')
                .upsert({
                  organization_id: orgId,
                  file_name: `${tableInfo.name} - Record ${recordId}`,
                  content_text: recordText,
                  source_type: 'quickbase',
                  unique_key: uniqueKey, // Add this for proper upsert behavior
                  metadata: {
                    quickbase_table_id: table.id,
                    quickbase_record_id: record[1]?.value,
                    quickbase_app_id: app_id,
                    table_name: tableInfo.name
                  }
                }, { onConflict: 'organization_id,file_name' });

              totalRecords++;
            }

            skip += records.length;
            hasMore = records.length === top; // Continue if we got a full batch
          }

          totalTables++;
          console.log(`Completed syncing table ${table.id} (${tableInfo.name})`);

        } catch (tableError: any) {
          console.error(`Error syncing table ${table.id}:`, tableError);
          continue; // Continue with other tables
        }
      }

      // Trigger embeddings generation for new content
      console.log('Triggering embeddings generation...');
      const embeddingsResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: orgId,
          source_type: 'quickbase'
        }),
      });

      let embeddingsResult = null;
      if (embeddingsResponse.ok) {
        embeddingsResult = await embeddingsResponse.json();
        console.log('Embeddings generation triggered successfully');
      } else {
        console.warn('Failed to trigger embeddings generation');
      }

      // Update sync status to success
      await supabaseClient
        .from('org_integrations')
        .update({ 
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('id', integrationId);

      console.log(`Sync completed: ${totalRecords} records from ${totalTables} tables`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Successfully synced ${totalRecords} records from ${totalTables} tables`,
          stats: {
            records: totalRecords,
            tables: totalTables,
            embeddings: embeddingsResult
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } catch (syncError: any) {
      console.error('Sync error:', syncError);
      
      // Update sync status to error
      await supabaseClient
        .from('org_integrations')
        .update({ 
          sync_status: 'error',
          sync_error: syncError.message
        })
        .eq('id', integrationId);

      return new Response(
        JSON.stringify({ 
          success: false,
          message: syncError.message || "Sync failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

  } catch (error: any) {
    console.error("Error in sync-quickbase-data:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Internal server error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});