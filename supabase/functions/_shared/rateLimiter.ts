import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export class RateLimiter {
  private supabase: any;
  private config: RateLimitConfig;

  constructor(supabaseUrl: string, supabaseKey: string, config: RateLimitConfig) {
    this.supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Clean up expired entries
      await this.supabase
        .from('rate_limit_entries')
        .delete()
        .lt('timestamp', new Date(windowStart).toISOString());

      // Get current request count
      const { data: entries, error: fetchError } = await this.supabase
        .from('rate_limit_entries')
        .select('*')
        .eq('key', key)
        .gte('timestamp', new Date(windowStart).toISOString());

      if (fetchError) {
        console.error('Rate limit check error:', fetchError);
        // Allow request on error to avoid blocking legitimate users
        return { allowed: true, remaining: this.config.maxRequests, resetAt: new Date(now + this.config.windowMs) };
      }

      const count = entries?.length || 0;
      const remaining = Math.max(0, this.config.maxRequests - count);
      const resetAt = new Date(now + this.config.windowMs);

      if (count >= this.config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt };
      }

      // Record this request
      await this.supabase
        .from('rate_limit_entries')
        .insert({
          key,
          timestamp: new Date().toISOString(),
        });

      return { allowed: true, remaining: remaining - 1, resetAt };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Allow request on error
      return { allowed: true, remaining: this.config.maxRequests, resetAt: new Date(now + this.config.windowMs) };
    }
  }
}

// Middleware for rate limiting
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig,
  getIdentifier: (req: Request) => string
): Promise<Response | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing for rate limiting');
    return null; // Allow request if rate limiting can't be configured
  }

  const limiter = new RateLimiter(supabaseUrl, supabaseKey, config);
  const identifier = getIdentifier(req);
  const result = await limiter.checkLimit(identifier);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${result.resetAt.toISOString()}`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null; // Continue with request
}

// Common rate limit configurations
export const rateLimitConfigs = {
  // Standard API endpoints - 100 requests per minute per user
  standard: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'api:standard',
  },
  // Authentication endpoints - 5 attempts per 15 minutes per IP
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'api:auth',
  },
  // Email sending - 10 emails per hour per user
  email: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'api:email',
  },
  // Webhook endpoints - 1000 requests per minute per webhook source
  webhook: {
    maxRequests: 1000,
    windowMs: 60 * 1000,
    keyPrefix: 'api:webhook',
  },
  // AI/Chat endpoints - 50 requests per minute per user
  ai: {
    maxRequests: 50,
    windowMs: 60 * 1000,
    keyPrefix: 'api:ai',
  },
};