-- Database functions for subscription management and usage tracking
-- Run this script to add the necessary functions for the Stripe subscription implementation

-- =====================================================
-- FUNCTION: track_query_usage
-- Tracks AI query usage for an organization
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_query_usage(
  p_user_id UUID,
  p_organization_id UUID,
  p_query_text TEXT DEFAULT NULL,
  p_response_text TEXT DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_can_proceed BOOLEAN;
  v_message TEXT;
BEGIN
  -- Get subscription for the organization
  SELECT * INTO v_subscription
  FROM subscriptions 
  WHERE organization_id = p_organization_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription, use free tier limits
  IF v_subscription IS NULL THEN
    v_limit := 100; -- Free tier
    v_current_usage := COALESCE(
      (SELECT COUNT(*) FROM queries 
       WHERE organization_id = p_organization_id 
       AND created_at >= date_trunc('month', CURRENT_DATE)),
      0
    );
  ELSE
    v_limit := COALESCE(v_subscription.query_limit, 100);
    v_current_usage := COALESCE(v_subscription.queries_used, 0);
  END IF;

  -- Check if usage would exceed limit
  IF v_current_usage >= v_limit THEN
    v_can_proceed := false;
    v_message := format('Query limit reached (%s/%s). Please upgrade your plan.', v_current_usage, v_limit);
  ELSE
    v_can_proceed := true;
    
    -- Record the query
    INSERT INTO queries (
      user_id,
      organization_id,
      query_text,
      response_text,
      tokens_used,
      created_at
    ) VALUES (
      p_user_id,
      p_organization_id,
      p_query_text,
      p_response_text,
      p_tokens_used,
      NOW()
    );

    -- Update subscription usage counter
    IF v_subscription IS NOT NULL THEN
      UPDATE subscriptions 
      SET 
        queries_used = queries_used + 1,
        updated_at = NOW()
      WHERE id = v_subscription.id;
    END IF;

    v_message := format('Query recorded. Usage: %s/%s', v_current_usage + 1, v_limit);
  END IF;

  -- Return status
  RETURN json_build_object(
    'success', v_can_proceed,
    'message', v_message,
    'current_usage', v_current_usage + (CASE WHEN v_can_proceed THEN 1 ELSE 0 END),
    'limit', v_limit,
    'percentage_used', ROUND(((v_current_usage + (CASE WHEN v_can_proceed THEN 1 ELSE 0 END))::NUMERIC / v_limit) * 100, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: check_subscription_limits
-- Checks if an action is allowed based on subscription limits
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_subscription_limits(
  p_organization_id UUID,
  p_limit_type TEXT -- 'users' or 'queries'
)
RETURNS JSON AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_can_proceed BOOLEAN;
  v_message TEXT;
BEGIN
  -- Get organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_organization_id;

  IF v_org IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Organization not found'
    );
  END IF;

  -- Get active subscription
  SELECT * INTO v_subscription
  FROM subscriptions 
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check based on limit type
  CASE p_limit_type
    WHEN 'users' THEN
      -- Count current users in organization
      v_current_usage := (
        SELECT COUNT(*) 
        FROM profiles 
        WHERE organization_id = p_organization_id
      );
      
      -- Determine limit
      IF v_subscription IS NULL THEN
        v_limit := 2; -- Free tier
      ELSE
        v_limit := COALESCE(v_org.user_limit, 
          CASE v_subscription.plan_type
            WHEN 'starter' THEN 5
            WHEN 'pro' THEN 20
            ELSE 2
          END
        );
      END IF;
      
      v_can_proceed := v_current_usage < v_limit;
      IF v_can_proceed THEN
        v_message := format('User limit OK: %s/%s users', v_current_usage, v_limit);
      ELSE
        v_message := format('User limit reached: %s/%s. Please upgrade to add more users.', v_current_usage, v_limit);
      END IF;

    WHEN 'queries' THEN
      -- Check query usage
      IF v_subscription IS NULL THEN
        v_limit := 100; -- Free tier
        v_current_usage := (
          SELECT COUNT(*) 
          FROM queries 
          WHERE organization_id = p_organization_id 
          AND created_at >= date_trunc('month', CURRENT_DATE)
        );
      ELSE
        v_limit := COALESCE(v_subscription.query_limit, 100);
        v_current_usage := COALESCE(v_subscription.queries_used, 0);
      END IF;
      
      v_can_proceed := v_current_usage < v_limit;
      IF v_can_proceed THEN
        v_message := format('Query limit OK: %s/%s queries this month', v_current_usage, v_limit);
      ELSE
        v_message := format('Monthly query limit reached: %s/%s. Please upgrade or wait for next billing cycle.', v_current_usage, v_limit);
      END IF;

    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid limit type. Use "users" or "queries".'
      );
  END CASE;

  -- Return result
  RETURN json_build_object(
    'success', v_can_proceed,
    'message', v_message,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'subscription_status', COALESCE(v_subscription.status, 'free'),
    'plan_type', COALESCE(v_subscription.plan_type, 'free')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_usage_stats
-- Gets current usage statistics for an organization
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_usage_stats(
  p_organization_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_user_count INTEGER;
  v_query_count INTEGER;
  v_user_limit INTEGER;
  v_query_limit INTEGER;
  v_storage_used NUMERIC;
  v_storage_limit INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM subscriptions 
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Count users
  v_user_count := (
    SELECT COUNT(*) 
    FROM profiles 
    WHERE organization_id = p_organization_id
  );

  -- Determine limits and usage based on subscription
  IF v_subscription IS NULL THEN
    -- Free tier defaults
    v_user_limit := 2;
    v_query_limit := 100;
    v_storage_limit := 5;
    v_query_count := (
      SELECT COUNT(*) 
      FROM queries 
      WHERE organization_id = p_organization_id 
      AND created_at >= date_trunc('month', CURRENT_DATE)
    );
    v_storage_used := 0;
  ELSE
    v_user_limit := CASE v_subscription.plan_type
      WHEN 'starter' THEN 5
      WHEN 'pro' THEN 20
      ELSE 2
    END;
    v_query_limit := COALESCE(v_subscription.query_limit, 100);
    v_query_count := COALESCE(v_subscription.queries_used, 0);
    v_storage_limit := COALESCE(v_subscription.storage_limit_gb, 5);
    v_storage_used := COALESCE(v_subscription.storage_used_gb, 0);
  END IF;

  -- Return comprehensive stats
  RETURN json_build_object(
    'users', json_build_object(
      'current', v_user_count,
      'limit', v_user_limit,
      'percentage', ROUND((v_user_count::NUMERIC / NULLIF(v_user_limit, 0)) * 100, 2),
      'can_add_more', v_user_count < v_user_limit
    ),
    'queries', json_build_object(
      'current', v_query_count,
      'limit', v_query_limit,
      'percentage', ROUND((v_query_count::NUMERIC / NULLIF(v_query_limit, 0)) * 100, 2),
      'can_query_more', v_query_count < v_query_limit,
      'reset_date', COALESCE(v_subscription.queries_reset_at, date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
    ),
    'storage', json_build_object(
      'used_gb', v_storage_used,
      'limit_gb', v_storage_limit,
      'percentage', ROUND((v_storage_used / NULLIF(v_storage_limit, 0)) * 100, 2)
    ),
    'subscription', json_build_object(
      'status', COALESCE(v_subscription.status, 'free'),
      'plan_type', COALESCE(v_subscription.plan_type, 'free'),
      'current_period_end', v_subscription.current_period_end
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: reset_monthly_queries_for_all
-- Resets query counts for all subscriptions (run monthly)
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_monthly_queries_for_all()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET 
    queries_used = 0,
    queries_reset_at = date_trunc('month', CURRENT_DATE) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE queries_reset_at <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.track_query_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_limits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_queries_for_all TO service_role;

-- Create index for faster query counting
CREATE INDEX IF NOT EXISTS idx_queries_org_created 
ON queries(organization_id, created_at DESC);

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status 
ON subscriptions(organization_id, status);