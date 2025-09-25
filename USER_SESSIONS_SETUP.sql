-- Session Enforcement Setup for AskRita
-- Run this SQL in your Supabase SQL Editor

-- 1. Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can create own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.user_sessions
FOR DELETE
USING (user_id = auth.uid());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen);

-- 5. Add seat_limit column to organizations table (for Starter plan enforcement)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS seat_limit INTEGER DEFAULT NULL;

-- Set default seat limits based on plan type
UPDATE public.organizations 
SET seat_limit = 3 
WHERE seat_limit IS NULL;

-- 6. Create function to enforce seat limits
CREATE OR REPLACE FUNCTION public.check_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_seat_limit INTEGER;
  current_user_count INTEGER;
BEGIN
  -- Get the organization's seat limit
  SELECT seat_limit INTO org_seat_limit
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- If no seat limit set, allow unlimited users
  IF org_seat_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current users in the organization
  SELECT COUNT(*) INTO current_user_count
  FROM public.profiles
  WHERE organization_id = NEW.organization_id;

  -- Check if adding this user would exceed the limit
  IF current_user_count >= org_seat_limit THEN
    RAISE EXCEPTION 'Organization has reached its seat limit of % users. Please upgrade your plan to add more users.', org_seat_limit;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Create trigger to enforce seat limits on profile creation
DROP TRIGGER IF EXISTS check_seat_limit_trigger ON public.profiles;
CREATE TRIGGER check_seat_limit_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_seat_limit();

-- 8. Create function to clean up old sessions (run this periodically via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Delete sessions older than 24 hours
  DELETE FROM public.user_sessions 
  WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$;