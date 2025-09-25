-- CRITICAL: Fix RLS policies to prevent privilege escalation
-- This script completely locks down the profiles table to prevent client-side privilege escalation

-- Drop all existing policies that allow dangerous operations
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- COMPLETELY BLOCK client profile creation - profiles must be created through secure functions only
-- No INSERT policy for authenticated users means they cannot create profiles at all

-- Completely revoke table-level UPDATE and INSERT, then grant only safe columns
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;

-- Grant UPDATE only for safe, non-privileged columns
GRANT UPDATE (first_name, last_name, phone_number, updated_at) ON public.profiles TO authenticated;

-- Create restrictive UPDATE policy that prevents privilege escalation
CREATE POLICY "Users can update their own profile (safe fields only)"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  AND organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Service role can do everything (needed for our secure edge functions)
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can manage profiles in their organization (keep existing policy)
-- This should already exist: "Organization admins can manage profiles in their org"

-- Add a database trigger as additional protection against privilege escalation
CREATE OR REPLACE FUNCTION prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow service_role to modify role or organization_id
  IF (TG_OP = 'UPDATE' AND (OLD.role <> NEW.role OR OLD.organization_id <> NEW.organization_id)) 
     OR (TG_OP = 'INSERT' AND NEW.role = 'admin') THEN
    
    -- Check if session user is service_role (not current_user which is function owner)
    IF session_user NOT IN ('service_role', 'postgres') THEN
      RAISE EXCEPTION 'Privilege escalation attempt blocked: only service_role can modify role or organization_id. Session user: %', session_user;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to profiles table
DROP TRIGGER IF EXISTS prevent_privilege_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_privilege_escalation();

-- Verify profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Log the security fix
INSERT INTO public.error_logs (level, message, context, function_name)
VALUES (
  'info',
  'Critical RLS security fix applied',
  '{"action": "prevent_privilege_escalation", "timestamp": "' || NOW() || '"}',
  'fix-rls-security'
);