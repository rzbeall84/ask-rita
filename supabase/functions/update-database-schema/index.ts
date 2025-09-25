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
    console.log("Updating database schema for promo codes...");

    // Add unlimited_usage column to subscriptions table if it doesn't exist
    const addUnlimitedUsageSQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'subscriptions' 
          AND column_name = 'unlimited_usage'
          AND table_schema = 'public'
        ) THEN
          ALTER TABLE public.subscriptions 
          ADD COLUMN unlimited_usage BOOLEAN DEFAULT FALSE;
          
          COMMENT ON COLUMN public.subscriptions.unlimited_usage IS 'Indicates if user has unlimited usage from promo codes';
        END IF;
      END $$;
    `;

    // Create query_usage table if it doesn't exist
    const createQueryUsageTableSQL = `
      CREATE TABLE IF NOT EXISTS public.query_usage (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        billing_period DATE NOT NULL,
        billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        queries_used INTEGER DEFAULT 0 NOT NULL,
        extra_queries_purchased INTEGER DEFAULT 0 NOT NULL,
        last_notification_80 TIMESTAMP WITH TIME ZONE,
        last_notification_100 TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        UNIQUE(org_id, billing_period)
      );
      
      -- Enable RLS
      ALTER TABLE public.query_usage ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE policyname = 'Users can view their organization query usage'
          AND tablename = 'query_usage'
        ) THEN
          CREATE POLICY "Users can view their organization query usage" 
          ON public.query_usage 
          FOR SELECT 
          USING (
            org_id IN (
              SELECT organization_id 
              FROM public.profiles 
              WHERE user_id = auth.uid()
            )
          );
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE policyname = 'Admins can manage their organization query usage'
          AND tablename = 'query_usage'
        ) THEN
          CREATE POLICY "Admins can manage their organization query usage" 
          ON public.query_usage 
          FOR ALL 
          USING (
            org_id IN (
              SELECT organization_id 
              FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        END IF;
      END $$;

      -- Create indexes if they don't exist
      CREATE INDEX IF NOT EXISTS idx_query_usage_org_billing_period ON public.query_usage(org_id, billing_period);
      CREATE INDEX IF NOT EXISTS idx_query_usage_org_id ON public.query_usage(org_id);
      CREATE INDEX IF NOT EXISTS idx_query_usage_period_dates ON public.query_usage(billing_period_start, billing_period_end);
    `;

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

    // Execute all the schema updates
    console.log("Adding unlimited_usage column to subscriptions...");
    const { error: columnError } = await supabaseClient.rpc('exec_sql', { 
      sql: addUnlimitedUsageSQL 
    });

    if (columnError) {
      console.error("Error adding unlimited_usage column:", columnError);
    }

    console.log("Creating/updating query_usage table...");
    const { error: tableError } = await supabaseClient.rpc('exec_sql', { 
      sql: createQueryUsageTableSQL 
    });

    if (tableError) {
      console.error("Error creating query_usage table:", tableError);
    }

    console.log("Updating handle_new_user function...");
    const { error: functionError } = await supabaseClient.rpc('exec_sql', { 
      sql: updateFunctionSQL 
    });

    if (functionError) {
      console.error("Error updating function:", functionError);
    }

    console.log("Database schema update completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Database schema and promo codes updated successfully",
        changes: [
          "Added unlimited_usage column to subscriptions table",
          "Created/updated query_usage table with billing periods",
          "Updated handle_new_user function with new promo codes"
        ],
        codes: {
          starter: "GEORGIAGRACE5908 - Unlimited Starter access",
          pro: "CHERICLAIRE5908 - Unlimited Pro access", 
          enterprise: "INGODWETRUST#0724 - Unlimited Enterprise access"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error updating database schema:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});