// CORS and Security Headers Configuration

// Deno global type declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'https://ask-rita-kt95eg6tk-drive-line.vercel.app',
  'https://askrita.org',
  'https://www.askrita.org',
];

export const corsHeaders = (origin?: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Max-Age': '86400',
  };

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if ((Deno as any).env.get('ENV') !== 'production') {
    // Allow all origins in development only
    headers['Access-Control-Allow-Origin'] = '*';
  }
  // In production, if origin is not allowed, don't set Access-Control-Allow-Origin header at all

  return headers;
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        ...securityHeaders,
      },
    });
  }
  return null;
}

export function addCorsHeaders(response: Response, req: Request): Response {
  const origin = req.headers.get('origin');
  const newHeaders = new Headers(response.headers);
  
  // Add CORS headers
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    if (value) newHeaders.set(key, value);
  });
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Environment variable validation
export function validateEnvVars(required: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const varName of required) {
    const value = (Deno as any).env.get(varName);
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// Request validation middleware
export function validateRequest(req: Request, options: {
  requireAuth?: boolean;
  requireBody?: boolean;
  allowedMethods?: string[];
}): { valid: boolean; error?: string } {
  // Check method
  if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
    return { valid: false, error: `Method ${req.method} not allowed` };
  }
  
  // Check auth header
  if (options.requireAuth) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Missing or invalid authorization header' };
    }
  }
  
  // Check content type for body requests
  if (options.requireBody && req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: false, error: 'Content-Type must be application/json' };
    }
  }
  
  return { valid: true };
}