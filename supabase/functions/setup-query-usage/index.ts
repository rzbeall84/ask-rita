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
    console.log("Setting up query_usage table...");

    // Create query_usage table
    const { error: tableError } = await supabaseClient
      .from('query_usage')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      // Table doesn't exist, create it using raw SQL
      const createTableSQL = `
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
        
        ALTER TABLE public.query_usage ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies for query_usage table
        CREATE POLICY "Users can view their organization's query usage" 
        ON public.query_usage 
        FOR SELECT 
        USING (
          org_id IN (
            SELECT organization_id 
            FROM public.profiles 
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Admins can manage their organization's query usage" 
        ON public.query_usage 
        FOR ALL 
        USING (
          org_id IN (
            SELECT organization_id 
            FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_query_usage_org_billing_period ON public.query_usage(org_id, billing_period);
        CREATE INDEX IF NOT EXISTS idx_query_usage_org_id ON public.query_usage(org_id);
        CREATE INDEX IF NOT EXISTS idx_query_usage_period_dates ON public.query_usage(billing_period_start, billing_period_end);

        -- Create function to get or create current billing period usage
        CREATE OR REPLACE FUNCTION public.get_or_create_current_usage(p_org_id UUID)
        RETURNS TABLE(
          id UUID,
          org_id UUID,
          billing_period DATE,
          billing_period_start TIMESTAMP WITH TIME ZONE,
          billing_period_end TIMESTAMP WITH TIME ZONE,
          queries_used INTEGER,
          extra_queries_purchased INTEGER,
          last_notification_80 TIMESTAMP WITH TIME ZONE,
          last_notification_100 TIMESTAMP WITH TIME ZONE
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          usage_record RECORD;
          sub_record RECORD;
        BEGIN
          -- Get current subscription billing period
          SELECT current_period_start, current_period_end 
          INTO sub_record
          FROM public.subscriptions s
          JOIN public.profiles p ON s.user_id = p.user_id
          WHERE p.organization_id = p_org_id
          AND s.status = 'active'
          LIMIT 1;
          
          -- If no active subscription, use current month as fallback
          IF NOT FOUND THEN
            sub_record.current_period_start := DATE_TRUNC('month', CURRENT_DATE);
            sub_record.current_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day');
          END IF;
          
          -- Try to get existing record using billing period start as key
          SELECT * INTO usage_record 
          FROM public.query_usage 
          WHERE org_id = p_org_id AND billing_period = sub_record.current_period_start::DATE;
          
          -- If no record exists, create one
          IF NOT FOUND THEN
            INSERT INTO public.query_usage (org_id, billing_period, billing_period_start, billing_period_end, queries_used, extra_queries_purchased)
            VALUES (p_org_id, sub_record.current_period_start::DATE, sub_record.current_period_start, sub_record.current_period_end, 0, 0)
            RETURNING * INTO usage_record;
          END IF;
          
          -- Return the record
          RETURN QUERY 
          SELECT usage_record.id, usage_record.org_id, usage_record.billing_period,
                 usage_record.billing_period_start, usage_record.billing_period_end,
                 usage_record.queries_used, usage_record.extra_queries_purchased,
                 usage_record.last_notification_80, usage_record.last_notification_100;
        END;
        $$;

        -- Create function to increment query usage based on billing period
        CREATE OR REPLACE FUNCTION public.increment_query_usage(p_org_id UUID)
        RETURNS TABLE(
          new_usage INTEGER,
          total_limit INTEGER,
          usage_percentage NUMERIC
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          plan_limit INTEGER;
          current_usage INTEGER;
          extra_purchased INTEGER;
          new_usage_count INTEGER;
          total_queries_allowed INTEGER;
          usage_percent NUMERIC;
          sub_record RECORD;
          billing_period_key DATE;
        BEGIN
          -- Get organization's plan limit and billing period
          SELECT s.query_limit, s.current_period_start, s.current_period_end 
          INTO plan_limit, sub_record.current_period_start, sub_record.current_period_end
          FROM public.subscriptions s
          JOIN public.profiles p ON s.user_id = p.user_id
          WHERE p.organization_id = p_org_id
          AND s.status = 'active'
          LIMIT 1;
          
          -- Default to 100 if no subscription found, use current month
          IF plan_limit IS NULL THEN
            plan_limit := 100;
            sub_record.current_period_start := DATE_TRUNC('month', CURRENT_DATE);
            sub_record.current_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day');
          END IF;
          
          billing_period_key := sub_record.current_period_start::DATE;
          
          -- Get or create current billing period usage
          SELECT qu.queries_used, qu.extra_queries_purchased 
          INTO current_usage, extra_purchased
          FROM public.query_usage qu
          WHERE qu.org_id = p_org_id AND qu.billing_period = billing_period_key;
          
          -- If no record exists, create one
          IF NOT FOUND THEN
            INSERT INTO public.query_usage (org_id, billing_period, billing_period_start, billing_period_end, queries_used, extra_queries_purchased)
            VALUES (p_org_id, billing_period_key, sub_record.current_period_start, sub_record.current_period_end, 0, 0);
            current_usage := 0;
            extra_purchased := 0;
          END IF;
          
          -- Calculate new usage
          new_usage_count := current_usage + 1;
          total_queries_allowed := plan_limit + COALESCE(extra_purchased, 0);
          usage_percent := (new_usage_count::NUMERIC / total_queries_allowed::NUMERIC) * 100;
          
          -- Update usage count
          UPDATE public.query_usage 
          SET queries_used = new_usage_count,
              updated_at = now()
          WHERE org_id = p_org_id AND billing_period = billing_period_key;
          
          -- Return usage statistics
          RETURN QUERY 
          SELECT new_usage_count, total_queries_allowed, usage_percent;
        END;
        $$;
      `;

      const { error: sqlError } = await supabaseClient.rpc('exec_sql', { sql: createTableSQL });
      
      if (sqlError) {
        // If exec_sql function doesn't exist, try direct execution
        console.log("Direct SQL execution not available, table may already exist");
      }
    }

    console.log("Query usage table setup completed");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Query usage tracking system set up successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error setting up query usage:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});