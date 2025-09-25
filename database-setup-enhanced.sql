-- Rita Recruit AI Enhanced Database Setup Script with Complete Multi-Tenant Isolation
-- This script creates all necessary tables, functions, and policies for the SAAS application

-- Drop existing types and recreate
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create role enum type
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- =====================================================
-- CORE TABLES WITH MULTI-TENANT SUPPORT
-- =====================================================

-- Create organizations table with enhanced fields
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

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create profiles table for extended user information
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

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create app_users table for managing user access with organization
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  has_access BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
  invite_token TEXT,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, organization_id)
);

-- Enable RLS for app_users
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create document categories table with organization scope
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_categories
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Create document folders table with organization scope
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  openai_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Create document files table
CREATE TABLE public.document_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  source TEXT DEFAULT 'upload',
  processing_status TEXT DEFAULT 'pending',
  has_content BOOLEAN DEFAULT false,
  ttl_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_files
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- Create document content table with organization scope
CREATE TABLE public.document_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.document_files(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  content_text TEXT NOT NULL,
  content_summary TEXT,
  processing_status TEXT DEFAULT 'completed',
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_content
ALTER TABLE public.document_content ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table with organization scope
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan_type TEXT,
  query_limit INTEGER,
  queries_used INTEGER DEFAULT 0,
  queries_reset_at TIMESTAMP WITH TIME ZONE,
  storage_limit_gb INTEGER,
  storage_used_gb NUMERIC DEFAULT 0,
  additional_storage_gb INTEGER DEFAULT 0,
  additional_storage_subscription_ids TEXT[],
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  intro_period_active BOOLEAN DEFAULT false,
  intro_cycles_remaining INTEGER,
  intro_end_date TIMESTAMP WITH TIME ZONE,
  intro_price_id TEXT,
  standard_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create queries table for tracking AI usage
CREATE TABLE public.queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  query_text TEXT,
  response_text TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for queries
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Create demo responses table (shared across all orgs)
CREATE TABLE public.demo_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  carrier_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for demo_responses
ALTER TABLE public.demo_responses ENABLE ROW LEVEL SECURITY;

-- Create waitlist signups table (no organization needed)
CREATE TABLE public.waitlist_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for waitlist_signups
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Create subscription add-ons table
CREATE TABLE public.subscription_add_ons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  add_on_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for subscription_add_ons
ALTER TABLE public.subscription_add_ons ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure invite tokens
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use invite token for self-registration
CREATE OR REPLACE FUNCTION public.use_invite_token(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  organization_id UUID,
  organization_name TEXT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_user_count INTEGER;
  v_user_limit INTEGER;
BEGIN
  -- Find organization by invite token
  SELECT o.id, o.name, o.invite_expires_at, o.user_limit
  INTO v_org_id, v_org_name, v_expires_at, v_user_limit
  FROM public.organizations o
  WHERE o.invite_token = p_token;

  -- Check if token exists
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::TEXT, 
      false, 
      'Invalid invite token'::TEXT;
    RETURN;
  END IF;

  -- Check if token has expired
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::TEXT, 
      false, 
      'Invite token has expired'::TEXT;
    RETURN;
  END IF;

  -- Check user limit
  SELECT COUNT(*) INTO v_user_count
  FROM public.profiles p
  WHERE p.organization_id = v_org_id;

  IF v_user_count >= v_user_limit THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::TEXT, 
      false, 
      'Organization has reached user limit'::TEXT;
    RETURN;
  END IF;

  -- Update user profile with organization
  UPDATE public.profiles
  SET organization_id = v_org_id
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    v_org_id, 
    v_org_name, 
    true, 
    'Successfully joined organization'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track query usage against organization limits
CREATE OR REPLACE FUNCTION public.track_query_usage(
  p_organization_id UUID,
  p_tokens_used INTEGER
)
RETURNS TABLE(
  allowed BOOLEAN,
  queries_remaining INTEGER,
  message TEXT
) AS $$
DECLARE
  v_query_limit INTEGER;
  v_queries_used INTEGER;
  v_queries_reset_at TIMESTAMP WITH TIME ZONE;
  v_subscription_id UUID;
BEGIN
  -- Get organization's query limits from subscription
  SELECT s.id, s.query_limit, s.queries_used, s.queries_reset_at
  INTO v_subscription_id, v_query_limit, v_queries_used, v_queries_reset_at
  FROM public.subscriptions s
  WHERE s.organization_id = p_organization_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Check if subscription exists
  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      0, 
      'No active subscription found'::TEXT;
    RETURN;
  END IF;

  -- Reset queries if period has passed
  IF v_queries_reset_at IS NULL OR v_queries_reset_at < NOW() THEN
    UPDATE public.subscriptions
    SET queries_used = 0,
        queries_reset_at = NOW() + INTERVAL '1 month'
    WHERE id = v_subscription_id;
    
    v_queries_used := 0;
  END IF;

  -- Check if within limit
  IF v_queries_used + 1 > v_query_limit THEN
    RETURN QUERY SELECT 
      false, 
      0, 
      'Query limit exceeded for this billing period'::TEXT;
    RETURN;
  END IF;

  -- Increment usage counter
  UPDATE public.subscriptions
  SET queries_used = queries_used + 1
  WHERE id = v_subscription_id;

  RETURN QUERY SELECT 
    true, 
    v_query_limit - v_queries_used - 1, 
    'Query allowed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription status and enforce limits
CREATE OR REPLACE FUNCTION public.check_subscription_limits(
  p_organization_id UUID
)
RETURNS TABLE(
  is_active BOOLEAN,
  plan_type TEXT,
  queries_remaining INTEGER,
  storage_remaining_gb NUMERIC,
  users_remaining INTEGER
) AS $$
DECLARE
  v_subscription RECORD;
  v_user_count INTEGER;
  v_org_limits RECORD;
BEGIN
  -- Get organization limits
  SELECT user_limit, query_limit
  INTO v_org_limits
  FROM public.organizations
  WHERE id = p_organization_id;

  -- Get active subscription
  SELECT *
  INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id = p_organization_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Count current users
  SELECT COUNT(*)
  INTO v_user_count
  FROM public.profiles
  WHERE organization_id = p_organization_id;

  -- Return subscription status
  IF v_subscription.id IS NOT NULL THEN
    RETURN QUERY SELECT
      true,
      v_subscription.plan_type,
      v_subscription.query_limit - v_subscription.queries_used,
      v_subscription.storage_limit_gb - v_subscription.storage_used_gb,
      v_org_limits.user_limit - v_user_count;
  ELSE
    RETURN QUERY SELECT
      false,
      'free'::TEXT,
      0,
      0::NUMERIC,
      0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create profile and organization on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  promo_code TEXT;
  plan_type TEXT;
  query_limit INTEGER;
  user_limit INTEGER;
  storage_limit INTEGER;
  stripe_price_id TEXT;
BEGIN
  -- Get promo code from user metadata
  promo_code := NEW.raw_user_meta_data ->> 'promo_code';
  
  -- Determine plan based on promo code or default
  IF promo_code = 'HAP-PENIS' THEN
    plan_type := 'pro';
    query_limit := 10000;
    user_limit := 50;
    storage_limit := 100;
    stripe_price_id := 'price_1S3it7DlNVaqt2O2BUr5aIBy';
  ELSE
    plan_type := 'starter';
    query_limit := 1000;
    user_limit := 5;
    storage_limit := 10;
    stripe_price_id := 'price_1S3iqzDlNVaqt2O2qStAeSXl';
  END IF;
  
  -- Create a new organization for the user
  INSERT INTO public.organizations (
    name, 
    owner_id, 
    user_limit, 
    query_limit,
    invite_token,
    invite_expires_at
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'User') || '''s Organization',
    NEW.id,
    user_limit,
    query_limit,
    public.generate_invite_token(),
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO new_org_id;

  -- Insert the profile with organization assignment
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    phone_number, 
    organization_id, 
    role
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    new_org_id,
    'admin'::public.user_role  -- First user in organization is admin
  );
  
  -- Create subscription record
  INSERT INTO public.subscriptions (
    user_id,
    organization_id,
    status,
    plan_type,
    query_limit,
    storage_limit_gb,
    stripe_price_id,
    queries_reset_at
  )
  VALUES (
    NEW.id,
    new_org_id,
    CASE 
      WHEN promo_code = 'HAP-PENIS' THEN 'active'
      ELSE 'inactive'
    END,
    plan_type,
    query_limit,
    storage_limit,
    stripe_price_id,
    NOW() + INTERVAL '1 month'
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_files_updated_at
  BEFORE UPDATE ON public.document_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_content_updated_at
  BEFORE UPDATE ON public.document_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_add_ons_updated_at
  BEFORE UPDATE ON public.subscription_add_ons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Organizations Policies
CREATE POLICY "Organization members can view their organization"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = organizations.id
      AND role = 'admin'
  )
);

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles Policies
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

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage profiles in their org"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = profiles.organization_id
      AND p.role = 'admin'
  )
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- App Users Policies
CREATE POLICY "Organization members can view app users in their org"
ON public.app_users
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage app users"
ON public.app_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = app_users.organization_id
      AND role = 'admin'
  )
);

-- Document Categories Policies
CREATE POLICY "Organization members can view categories"
ON public.document_categories
FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage categories"
ON public.document_categories
FOR ALL
USING (
  organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = document_categories.organization_id
      AND role = 'admin'
  )
);

-- Document Folders Policies
CREATE POLICY "Organization members can view folders in their org"
ON public.document_folders
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own folders"
ON public.document_folders
FOR ALL
USING (
  user_id = auth.uid() AND
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage all folders"
ON public.document_folders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = document_folders.organization_id
      AND role = 'admin'
  )
);

-- Document Files Policies
CREATE POLICY "Organization members can view files in their org"
ON public.document_files
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own files"
ON public.document_files
FOR ALL
USING (
  user_id = auth.uid() AND
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage all files"
ON public.document_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = document_files.organization_id
      AND role = 'admin'
  )
);

-- Document Content Policies
CREATE POLICY "Organization members can view content in their org"
ON public.document_content
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage content"
ON public.document_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = document_content.organization_id
      AND role = 'admin'
  )
);

-- Subscriptions Policies
CREATE POLICY "Organization members can view their org subscription"
ON public.subscriptions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage subscription"
ON public.subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = subscriptions.organization_id
      AND role = 'admin'
  )
);

-- Subscription Add-ons Policies
CREATE POLICY "Organization members can view subscription add-ons"
ON public.subscription_add_ons
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage subscription add-ons"
ON public.subscription_add_ons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organization_id = subscription_add_ons.organization_id
      AND role = 'admin'
  )
);

-- Queries Policies
CREATE POLICY "Organization members can view queries in their org"
ON public.queries
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create queries in their org"
ON public.queries
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Demo Responses Policies (public read-only)
CREATE POLICY "Everyone can view demo responses"
ON public.demo_responses
FOR SELECT
USING (true);

CREATE POLICY "System can manage demo responses"
ON public.demo_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Waitlist Signups Policies
CREATE POLICY "Anyone can sign up for waitlist"
ON public.waitlist_signups
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view waitlist"
ON public.waitlist_signups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for foreign key relationships and common queries
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_app_users_organization_id ON public.app_users(organization_id);
CREATE INDEX idx_app_users_email ON public.app_users(email);
CREATE INDEX idx_document_categories_organization_id ON public.document_categories(organization_id);
CREATE INDEX idx_document_folders_organization_id ON public.document_folders(organization_id);
CREATE INDEX idx_document_folders_user_id ON public.document_folders(user_id);
CREATE INDEX idx_document_files_organization_id ON public.document_files(organization_id);
CREATE INDEX idx_document_files_folder_id ON public.document_files(folder_id);
CREATE INDEX idx_document_content_organization_id ON public.document_content(organization_id);
CREATE INDEX idx_document_content_file_id ON public.document_content(file_id);
CREATE INDEX idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscription_add_ons_organization_id ON public.subscription_add_ons(organization_id);
CREATE INDEX idx_queries_organization_id ON public.queries(organization_id);
CREATE INDEX idx_queries_user_id ON public.queries(user_id);
CREATE INDEX idx_organizations_invite_token ON public.organizations(invite_token);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- SEED DATA FOR DEMO
-- =====================================================

-- Insert demo responses
INSERT INTO public.demo_responses (question_text, answer_text, carrier_name) VALUES
('What are the coverage limits for property damage?', 'The standard property damage coverage limit is $500,000 per occurrence with a $1,000 deductible. Higher limits up to $2 million are available.', 'Sample Insurance Co'),
('Does the policy cover water damage from pipe bursts?', 'Yes, sudden and accidental water damage from burst pipes is covered under the standard policy. Gradual leaks or maintenance issues are excluded.', 'Sample Insurance Co'),
('What is the waiting period for filing a claim?', 'There is no waiting period for filing claims. You should report any covered loss as soon as possible, ideally within 48 hours of discovery.', 'Sample Insurance Co');

-- =====================================================
-- MIGRATION HELPERS (if updating existing database)
-- =====================================================

-- Add organization_id to existing tables if they don't have it
DO $$
BEGIN
  -- Check and add organization_id to document_folders if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_folders' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.document_folders 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Update existing records to use organization from profile
    UPDATE public.document_folders df
    SET organization_id = p.organization_id
    FROM public.profiles p
    WHERE df.user_id = p.user_id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.document_folders 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- Check and add organization_id to document_content if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_content' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.document_content 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Update existing records to use organization from file
    UPDATE public.document_content dc
    SET organization_id = df.organization_id
    FROM public.document_files df
    WHERE dc.file_id = df.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.document_content 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- Add new fields to organizations table if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'invite_token'
  ) THEN
    ALTER TABLE public.organizations 
    ADD COLUMN invite_token TEXT UNIQUE,
    ADD COLUMN invite_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN logo_url TEXT,
    ADD COLUMN user_limit INTEGER DEFAULT 5,
    ADD COLUMN query_limit INTEGER DEFAULT 1000;
    
    -- Generate invite tokens for existing organizations
    UPDATE public.organizations
    SET invite_token = public.generate_invite_token(),
        invite_expires_at = NOW() + INTERVAL '30 days'
    WHERE invite_token IS NULL;
  END IF;

  -- Add organization_id to subscriptions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Update existing records to use organization from profile
    UPDATE public.subscriptions s
    SET organization_id = p.organization_id
    FROM public.profiles p
    WHERE s.user_id = p.user_id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.subscriptions 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;