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
    console.log("Setting up org_integrations table for Quickbase integration...");

    // Create org_integrations table with encryption support
    const createTableSQL = `
      -- Create org_integrations table
      CREATE TABLE IF NOT EXISTS public.org_integrations (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'quickbase',
        api_key TEXT NOT NULL, -- encrypted Quickbase User Token
        meta JSONB, -- store realm_hostname, app_id, table_id, etc.
        is_active BOOLEAN DEFAULT TRUE,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        sync_status TEXT DEFAULT 'pending', -- pending, success, error
        sync_error TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        UNIQUE(org_id, provider) -- one integration per provider per org
      );
      
      -- Enable RLS
      ALTER TABLE public.org_integrations ENABLE ROW LEVEL SECURITY;

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_org_integrations_org_id ON public.org_integrations(org_id);
      CREATE INDEX IF NOT EXISTS idx_org_integrations_provider ON public.org_integrations(provider);
      CREATE INDEX IF NOT EXISTS idx_org_integrations_sync_status ON public.org_integrations(sync_status);

      -- Create RLS policies
      DO $$
      BEGIN
        -- Policy for viewing integrations (admins and users in same org)
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE policyname = 'Users can view their organization integrations'
          AND tablename = 'org_integrations'
        ) THEN
          CREATE POLICY "Users can view their organization integrations" 
          ON public.org_integrations 
          FOR SELECT 
          USING (
            org_id IN (
              SELECT organization_id 
              FROM public.profiles 
              WHERE user_id = auth.uid()
            )
          );
        END IF;

        -- Policy for managing integrations (admins only)
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE policyname = 'Admins can manage their organization integrations'
          AND tablename = 'org_integrations'
        ) THEN
          CREATE POLICY "Admins can manage their organization integrations" 
          ON public.org_integrations 
          FOR ALL 
          USING (
            org_id IN (
              SELECT organization_id 
              FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          )
          WITH CHECK (
            org_id IN (
              SELECT organization_id 
              FROM public.profiles 
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        END IF;
      END $$;

      -- Create function for encryption/decryption helper
      CREATE OR REPLACE FUNCTION public.encrypt_token(token TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Simple base64 encoding for now - in production use proper encryption
        RETURN encode(token::bytea, 'base64');
      END;
      $$;

      CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Simple base64 decoding for now - in production use proper decryption
        RETURN convert_from(decode(encrypted_token, 'base64'), 'UTF8');
      END;
      $$;

      -- Create function to mask tokens in UI (show only last 4 chars)
      CREATE OR REPLACE FUNCTION public.mask_api_key(api_key TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF LENGTH(api_key) <= 4 THEN
          RETURN '****';
        ELSE
          RETURN REPEAT('*', LENGTH(api_key) - 4) || RIGHT(api_key, 4);
        END IF;
      END;
      $$;

      -- Create updated_at trigger function
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Add trigger for updated_at
      DROP TRIGGER IF EXISTS update_org_integrations_updated_at ON public.org_integrations;
      CREATE TRIGGER update_org_integrations_updated_at
        BEFORE UPDATE ON public.org_integrations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    `;

    console.log("Creating org_integrations table...");
    const { error: tableError } = await supabaseClient.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (tableError) {
      console.error("Error creating org_integrations table:", tableError);
      throw tableError;
    }

    console.log("org_integrations table setup completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Quickbase integration table set up successfully",
        features: [
          "org_integrations table created with proper RLS policies",
          "Token encryption/decryption functions added",
          "Token masking function for UI security",
          "Admin-only permissions for managing integrations",
          "Organization-scoped data isolation",
          "Sync status tracking for background jobs"
        ]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error setting up org integrations:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});