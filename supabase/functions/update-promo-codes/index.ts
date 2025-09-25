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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("Updating handle_new_user function with new promo codes...");

    // Updated handle_new_user function with new tier-specific unlimited promo codes
    const updateFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = public
      AS $$
      DECLARE
        new_org_id UUID;
        promo_code TEXT;
      BEGIN
        -- Get promo code from user metadata
        promo_code := NEW.raw_user_meta_data ->> 'promo_code';
        
        -- Create a new organization for the user
        INSERT INTO public.organizations (name, owner_id)
        VALUES (
          COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User') || '''s Organization',
          NEW.id
        )
        RETURNING id INTO new_org_id;

        -- Insert the profile
        INSERT INTO public.profiles (user_id, first_name, last_name, phone_number, organization_id, role)
        VALUES (
          NEW.id,
          NEW.raw_user_meta_data ->> 'first_name',
          NEW.raw_user_meta_data ->> 'last_name',
          NEW.raw_user_meta_data ->> 'phone_number',
          new_org_id,
          'admin'::public.user_role
        );
        
        -- Create subscription with new tier-specific unlimited promo codes
        INSERT INTO public.subscriptions (
          user_id, 
          organization_id,
          status, 
          plan_type, 
          query_limit, 
          storage_limit_gb,
          current_period_start,
          current_period_end,
          unlimited_usage
        )
        VALUES (
          NEW.id,
          new_org_id,
          CASE 
            WHEN promo_code IN ('GEORGIAGRACE5908', 'CHERICLAIRE5908', 'INGODWETRUST#0724') THEN 'active'
            ELSE 'inactive'
          END,
          CASE 
            WHEN promo_code = 'GEORGIAGRACE5908' THEN 'starter'
            WHEN promo_code = 'CHERICLAIRE5908' THEN 'pro' 
            WHEN promo_code = 'INGODWETRUST#0724' THEN 'enterprise'
            ELSE 'free'
          END,
          CASE 
            WHEN promo_code = 'GEORGIAGRACE5908' THEN 999999999  -- Unlimited for starter
            WHEN promo_code = 'CHERICLAIRE5908' THEN 999999999   -- Unlimited for pro
            WHEN promo_code = 'INGODWETRUST#0724' THEN 999999999 -- Unlimited for enterprise
            ELSE 100  -- Free tier default
          END,
          CASE 
            WHEN promo_code = 'GEORGIAGRACE5908' THEN 999999   -- Unlimited storage for starter
            WHEN promo_code = 'CHERICLAIRE5908' THEN 999999    -- Unlimited storage for pro
            WHEN promo_code = 'INGODWETRUST#0724' THEN 999999  -- Unlimited storage for enterprise
            ELSE 1  -- Free tier default
          END,
          NOW(),
          NOW() + INTERVAL '100 years',  -- Far future expiry for unlimited access
          CASE 
            WHEN promo_code IN ('GEORGIAGRACE5908', 'CHERICLAIRE5908', 'INGODWETRUST#0724') THEN TRUE
            ELSE FALSE
          END
        );
        
        RETURN NEW;
      END;
      $$;
    `;

    // Execute the function update
    const { error } = await supabaseClient.rpc('exec_sql', { 
      sql: updateFunctionSQL 
    });

    if (error) {
      console.error("Error updating function:", error);
      throw new Error(`Failed to update handle_new_user function: ${error.message}`);
    }

    console.log("Successfully updated handle_new_user function with new promo codes");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Promo codes updated successfully",
        codes: {
          starter: "GEORGIAGRACE5908 - Unlimited Starter access",
          pro: "CHERICLAIRE5908 - Unlimited Pro access", 
          enterprise: "INGODWETRUST#0724 - Unlimited Enterprise access"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error updating promo codes:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});