-- Core database setup for Rita Recruit AI
-- Run this script in Supabase SQL Editor

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

-- Create profiles table
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

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT,
  query_limit INTEGER,
  queries_used INTEGER DEFAULT 0,
  storage_limit_gb INTEGER,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
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
  
  -- Create subscription with promo code handling
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

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for Organizations
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

-- RLS Policies for Profiles
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

-- RLS Policies for Subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (user_id = auth.uid());

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
