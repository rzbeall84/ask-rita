-- =====================================================
-- RITA RECRUIT AI PRODUCTION DEPLOYMENT SCRIPT
-- For Supabase Project: onargmygfwynbbrytkpy.supabase.co
-- =====================================================

-- This is the complete database setup for Rita Recruit AI production environment
-- Run this script in the Supabase SQL Editor in the following order:

-- =====================================================
-- 1. ENABLE EXTENSIONS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =====================================================
-- 2. CREATE TYPES
-- =====================================================

-- Drop existing types and recreate
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- =====================================================
-- 3. CORE TABLES WITH MULTI-TENANT SUPPORT
-- =====================================================

-- Organizations table with enhanced fields
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_demo BOOLEAN DEFAULT false,
  
  -- Invite system fields
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Branding fields
  logo_url TEXT,
  
  -- Subscription-based limits
  user_limit INTEGER DEFAULT 5,
  query_limit INTEGER DEFAULT 1000,
  monthly_query_cap INTEGER DEFAULT 1000,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles table for extended user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organization invitations table
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organization subscriptions table
CREATE TABLE public.organization_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  
  -- Billing period
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Plan limits
  max_users INTEGER DEFAULT 2,
  max_documents INTEGER DEFAULT 10,
  max_searches_per_month INTEGER DEFAULT 100,
  
  -- Grace period for failed payments
  grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Document categories table
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Document folders table
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.document_categories(id),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_hidden BOOLEAN DEFAULT false,
  openai_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Document files table
CREATE TABLE public.document_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'upload',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  has_content BOOLEAN DEFAULT false,
  ttl_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- Document content table
CREATE TABLE public.document_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.document_files(id) ON DELETE CASCADE NOT NULL,
  content_text TEXT NOT NULL,
  content_summary TEXT,
  processing_status TEXT DEFAULT 'completed',
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_content ENABLE ROW LEVEL SECURITY;

-- Document embeddings table with pgvector
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_content_id UUID REFERENCES public.document_content(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.document_files(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Embedding data
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-ada-002 dimension
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER,
  
  -- Metadata
  file_name TEXT,
  folder_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- User sessions table for multi-login enforcement
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Query usage tracking table
CREATE TABLE public.query_usage (
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

-- Rate limiting table
CREATE TABLE public.rate_limit_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Logging tables
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  provider_response TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Organization indexes
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_invite_token ON public.organizations(invite_token);

-- Profile indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- Document indexes
CREATE INDEX idx_document_files_organization_id ON public.document_files(organization_id);
CREATE INDEX idx_document_files_folder_id ON public.document_files(folder_id);
CREATE INDEX idx_document_files_processing_status ON public.document_files(processing_status);
CREATE INDEX idx_document_folders_organization_id ON public.document_folders(organization_id);
CREATE INDEX idx_document_embeddings_org ON public.document_embeddings(organization_id);
CREATE INDEX idx_document_embeddings_content ON public.document_embeddings(document_content_id);
CREATE INDEX idx_document_embeddings_file ON public.document_embeddings(file_id);

-- Vector similarity index
CREATE INDEX idx_document_embeddings_vector ON public.document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Query usage indexes
CREATE INDEX idx_query_usage_org_period ON public.query_usage(org_id, billing_period);

-- Rate limiting indexes
CREATE INDEX idx_rate_limit_key_timestamp ON public.rate_limit_entries(key, timestamp);

-- =====================================================
-- 5. CORE FUNCTIONS
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  promo_code TEXT;
  plan_type TEXT := 'free';
  query_limit INTEGER := 100;
  storage_limit INTEGER := 1;
BEGIN
  -- Get promo code from user metadata
  promo_code := NEW.raw_user_meta_data ->> 'promo_code';
  
  -- Set plan based on promo code
  IF promo_code = 'HAP-PENIS' THEN
    plan_type := 'pro';
    query_limit := 10000;
    storage_limit := 10;
  END IF;
  
  -- Create a new organization for the user
  INSERT INTO public.organizations (name, owner_id, query_limit)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User') || '''s Organization',
    NEW.id,
    query_limit
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
  
  -- Create subscription record
  INSERT INTO public.organization_subscriptions (
    organization_id,
    plan_type,
    status,
    max_users,
    max_documents,
    max_searches_per_month
  )
  VALUES (
    new_org_id,
    plan_type,
    'active',
    CASE plan_type WHEN 'pro' THEN 50 ELSE 2 END,
    CASE plan_type WHEN 'pro' THEN 1000 ELSE 10 END,
    query_limit
  );
  
  RETURN NEW;
END;
$$;

-- Function to search document embeddings
CREATE OR REPLACE FUNCTION public.search_document_embeddings(
  query_embedding vector(1536),
  p_organization_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  file_id UUID,
  file_name TEXT,
  folder_name TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.file_id,
    de.file_name,
    de.folder_name,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE 
    de.organization_id = p_organization_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload()
RETURNS trigger AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  -- Get organization_id from the folder
  SELECT df.organization_id INTO v_organization_id
  FROM public.document_folders df
  WHERE df.id = NEW.folder_id;

  -- Validate file size (10MB limit)
  IF NEW.file_size > 10485760 THEN
    RAISE EXCEPTION 'File size exceeds 10MB limit';
  END IF;

  -- Validate file type
  IF NEW.file_type NOT IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ) THEN
    RAISE EXCEPTION 'Unsupported file type';
  END IF;

  -- Set organization_id if not set
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = v_organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for file upload validation
CREATE TRIGGER validate_file_upload_trigger
  BEFORE INSERT OR UPDATE ON public.document_files
  FOR EACH ROW
  EXECUTE FUNCTION validate_file_upload();

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Organizations policies
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Organization owners can update their organization"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Organization invitations policies
CREATE POLICY "Users can view invitations for their organization"
ON public.organization_invitations
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can create invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Organization subscriptions policies
CREATE POLICY "Users can view their organization's subscription"
ON public.organization_subscriptions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Document categories policies (public read)
CREATE POLICY "Anyone can view document categories"
ON public.document_categories
FOR SELECT
USING (true);

-- Document folders policies
CREATE POLICY "Users can view folders in their organization"
ON public.document_folders
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create folders in their organization"
ON public.document_folders
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update folders in their organization"
ON public.document_folders
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Document files policies
CREATE POLICY "Users can view files in their organization"
ON public.document_files
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their organization"
ON public.document_files
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update files in their organization"
ON public.document_files
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Document content policies
CREATE POLICY "Users can view content for files in their organization"
ON public.document_content
FOR SELECT
USING (
  file_id IN (
    SELECT id 
    FROM public.document_files 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create content for files in their organization"
ON public.document_content
FOR INSERT
WITH CHECK (
  file_id IN (
    SELECT id 
    FROM public.document_files 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Document embeddings policies
CREATE POLICY "Users can view embeddings for their organization"
ON public.document_embeddings
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create embeddings for their organization"
ON public.document_embeddings
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- User sessions policies
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
USING (user_id = auth.uid());

-- Query usage policies
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

-- =====================================================
-- 8. INSERT DEFAULT DATA
-- =====================================================

-- Insert default document categories
INSERT INTO public.document_categories (name, description, icon) VALUES
('General', 'General documents and files', 'FileText'),
('Contracts', 'Legal contracts and agreements', 'FileContract'),
('Resumes', 'Candidate resumes and CVs', 'User'),
('Job Descriptions', 'Job postings and descriptions', 'Briefcase'),
('Training Materials', 'Training documents and resources', 'GraduationCap'),
('Compliance', 'Compliance and regulatory documents', 'Shield')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 10. STORAGE BUCKET SETUP
-- =====================================================

-- Create the documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents', 
  false,
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain'
  ];

-- Storage policies for documents bucket
CREATE POLICY "Organization members can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

CREATE POLICY "Organization members can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

CREATE POLICY "Organization members can update their documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND split_part(name, '/', 1)::uuid = auth.uid()
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
)
WITH CHECK (
  bucket_id = 'documents' 
  AND split_part(name, '/', 1)::uuid = auth.uid()
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

CREATE POLICY "Organization admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles
    WHERE role = 'admin'
    AND organization_id IN (
      SELECT df.organization_id
      FROM public.document_folders df
      WHERE df.id = split_part(name, '/', 2)::uuid
    )
  )
);

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- The database is now ready for Rita Recruit AI production deployment!
-- Next steps:
-- 1. Deploy all edge functions using `supabase functions deploy`
-- 2. Configure environment variables in Supabase Dashboard
-- 3. Set up admin user using the create-admin-user function
-- 4. Test all functionality end-to-end

SELECT 'Rita Recruit AI database setup completed successfully!' as status;