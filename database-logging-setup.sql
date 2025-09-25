-- Logging and Monitoring Tables for AskRita
-- This script creates tables for error logging, email tracking, webhook logs, and rate limiting

-- =====================================================
-- ERROR LOGGING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  component TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_level ON public.error_logs(level);

-- RLS Policies - only service role can insert, admins can read
CREATE POLICY "Service role can insert error logs" ON public.error_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- EMAIL LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- RLS Policies
CREATE POLICY "Service role can insert email logs" ON public.email_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- WEBHOOK LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  status TEXT CHECK (status IN ('success', 'error')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_webhook_type ON public.webhook_logs(webhook_type);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);

-- RLS Policies
CREATE POLICY "Service role can insert webhook logs" ON public.webhook_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- RATE LIMIT ENTRIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_rate_limit_key ON public.rate_limit_entries(key);
CREATE INDEX idx_rate_limit_timestamp ON public.rate_limit_entries(timestamp DESC);

-- Create composite index for common queries
CREATE INDEX idx_rate_limit_key_timestamp ON public.rate_limit_entries(key, timestamp DESC);

-- RLS Policies - only service role can access
CREATE POLICY "Service role can manage rate limits" ON public.rate_limit_entries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- UPDATE SUBSCRIPTIONS TABLE FOR GRACE PERIOD
-- =====================================================

-- Add grace_period_end column if it doesn't exist
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE;

-- Add stripe_customer_email for better tracking
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_email TEXT;

-- =====================================================
-- CREATE STORAGE BUCKET FOR ORGANIZATION LOGOS
-- =====================================================

-- Create the assets bucket for organization logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for organization logos
CREATE POLICY "Authenticated users can upload organization logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets' 
    AND (storage.foldername(name))[1] = 'organization-logos'
  );

CREATE POLICY "Public can view organization logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'organization-logos');

CREATE POLICY "Admins can update organization logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assets' 
    AND (storage.foldername(name))[1] = 'organization-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'assets' 
    AND (storage.foldername(name))[1] = 'organization-logos'
  );

CREATE POLICY "Admins can delete organization logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets' 
    AND (storage.foldername(name))[1] = 'organization-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- CLEANUP FUNCTION FOR OLD LOGS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete error logs older than 90 days
  DELETE FROM public.error_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete email logs older than 30 days
  DELETE FROM public.email_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete webhook logs older than 30 days
  DELETE FROM public.webhook_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete rate limit entries older than 1 hour
  DELETE FROM public.rate_limit_entries WHERE timestamp < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This needs to be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-old-logs', '0 3 * * *', 'SELECT cleanup_old_logs();');

-- =====================================================
-- MONITORING VIEWS
-- =====================================================

-- View for recent errors
CREATE OR REPLACE VIEW recent_errors AS
SELECT 
  id,
  level,
  message,
  component,
  user_id,
  created_at
FROM public.error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- View for email statistics
CREATE OR REPLACE VIEW email_statistics AS
SELECT 
  DATE(created_at) as date,
  type,
  status,
  COUNT(*) as count
FROM public.email_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), type, status
ORDER BY date DESC;

-- Grant permissions on views
GRANT SELECT ON recent_errors TO authenticated;
GRANT SELECT ON email_statistics TO authenticated;