-- Rita Recruit AI Database Setup Script
-- This script creates all necessary tables, functions, and policies for the SAAS application

-- Create role enum type
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  is_demo BOOLEAN DEFAULT false,
  monthly_query_cap INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create profiles table for extended user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create app_users table for managing user access
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  has_access BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_by UUID REFERENCES auth.users(id),
  auth_user_id UUID REFERENCES auth.users(id) NULL,
  invite_token TEXT,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for app_users
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create document categories table
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_categories
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Create document folders table
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.document_categories(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
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
  folder_id UUID REFERENCES public.document_folders(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  source TEXT DEFAULT 'upload',
  processing_status TEXT DEFAULT 'pending',
  has_content BOOLEAN DEFAULT false,
  ttl_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_files
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- Create document content table
CREATE TABLE public.document_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.document_files(id) NOT NULL,
  content_text TEXT NOT NULL,
  content_summary TEXT,
  processing_status TEXT DEFAULT 'completed',
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_content
ALTER TABLE public.document_content ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
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
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  query_text TEXT,
  response_text TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for queries
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Create demo responses table
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

-- Create waitlist signups table
CREATE TABLE public.waitlist_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for waitlist_signups
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create function to automatically create profile and organization on user signup
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

  -- Insert the profile with organization assignment
  INSERT INTO public.profiles (user_id, first_name, last_name, phone_number, organization_id, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    new_org_id,
    'admin'::public.user_role  -- First user in organization is admin
  );
  
  -- Create subscription record with promo code handling
  INSERT INTO public.subscriptions (
    user_id, 
    status, 
    plan_type, 
    query_limit, 
    storage_limit_gb
  )
  VALUES (
    NEW.id,
    CASE 
      WHEN promo_code = 'HAP-PENIS' THEN 'active'
      ELSE 'inactive'
    END,
    CASE 
      WHEN promo_code = 'HAP-PENIS' THEN 'standard'
      ELSE 'free'
    END,
    CASE 
      WHEN promo_code = 'HAP-PENIS' THEN 10000
      ELSE 100
    END,
    CASE 
      WHEN promo_code = 'HAP-PENIS' THEN 10
      ELSE 1
    END
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for Organizations
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

CREATE POLICY "Organization owners can update their organization"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- RLS Policies for Profiles
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

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

CREATE POLICY "Organization admins can update profiles in their org"
ON public.profiles
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- RLS Policies for Document Categories (global read access)
CREATE POLICY "Anyone can view document categories"
ON public.document_categories
FOR SELECT
USING (true);

-- RLS Policies for Document Folders
CREATE POLICY "Users can view folders in their organization"
ON public.document_folders
FOR SELECT
USING (
  user_id IN (
    SELECT user_id 
    FROM public.profiles 
    WHERE organization_id = (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create folders in their organization"
ON public.document_folders
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
ON public.document_folders
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
ON public.document_folders
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for Document Files
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

CREATE POLICY "Users can create their own files"
ON public.document_files
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files"
ON public.document_files
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files"
ON public.document_files
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for Document Content
CREATE POLICY "Users can view document content in their organization"
ON public.document_content
FOR SELECT
USING (
  file_id IN (
    SELECT df.id 
    FROM public.document_files df
    JOIN public.profiles p ON df.user_id = p.user_id
    WHERE p.organization_id = (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create document content for their files"
ON public.document_content
FOR INSERT
WITH CHECK (
  file_id IN (
    SELECT id 
    FROM public.document_files 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update document content for their files"
ON public.document_content
FOR UPDATE
USING (
  file_id IN (
    SELECT id 
    FROM public.document_files 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for Subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for Queries
CREATE POLICY "Users can view queries in their organization"
ON public.queries
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create queries"
ON public.queries
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for Demo Responses (public read access)
CREATE POLICY "Anyone can view demo responses"
ON public.demo_responses
FOR SELECT
USING (true);

-- RLS Policies for Waitlist Signups (public insert access)
CREATE POLICY "Anyone can create waitlist signups"
ON public.waitlist_signups
FOR INSERT
WITH CHECK (true);

-- Insert default document categories
INSERT INTO public.document_categories (name, description, icon) VALUES
('General', 'General documents and files', 'FileText'),
('Contracts', 'Legal contracts and agreements', 'FileContract'),
('Resumes', 'Candidate resumes and CVs', 'User'),
('Job Descriptions', 'Job postings and descriptions', 'Briefcase'),
('Training Materials', 'Training documents and resources', 'GraduationCap'),
('Compliance', 'Compliance and regulatory documents', 'Shield');

-- Create utility functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_month_query_count(p_org UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.queries
    WHERE organization_id = p_org
    AND created_at >= date_trunc('month', CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_active_subscription_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create search functions for documents
CREATE OR REPLACE FUNCTION public.search_user_documents(
  p_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  file_id UUID,
  file_name TEXT,
  folder_name TEXT,
  category_name TEXT,
  content_snippet TEXT,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    df.id,
    df.file_name,
    dfolder.name,
    dcat.name,
    LEFT(dc.content_text, 200) || '...',
    0.5::REAL
  FROM public.document_files df
  JOIN public.document_folders dfolder ON df.folder_id = dfolder.id
  JOIN public.document_categories dcat ON dfolder.category_id = dcat.id
  JOIN public.document_content dc ON df.id = dc.file_id
  JOIN public.profiles p ON df.user_id = p.user_id
  WHERE p.organization_id = (
    SELECT organization_id FROM public.profiles WHERE user_id = p_user_id
  )
  AND (
    df.file_name ILIKE '%' || p_search_query || '%'
    OR dc.content_text ILIKE '%' || p_search_query || '%'
  )
  ORDER BY df.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
