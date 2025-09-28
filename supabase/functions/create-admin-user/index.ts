// @ts-ignore - Deno runtime imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno runtime imports  
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Declare Deno for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// CORS handler - inlined to work standalone
function handleCors(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  return null;
}

function addCorsHeaders(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  return response;
}

// Rate limiter - inlined
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function withRateLimit<T>(
  identifier: string,
  config: { maxRequests: number; windowMs: number },
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const key = identifier;
    
    let bucket = rateLimitStore.get(key);
    
    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, bucket);
    }
    
    if (bucket.count >= config.maxRequests) {
      const rateLimitError = new Error(`Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`);
      (rateLimitError as any).statusCode = 429;
      reject(rateLimitError);
      return;
    }
    
    bucket.count++;
    fn().then(resolve).catch(reject);
  });
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { email, password, firstName, lastName, adminCode } = await req.json();
    
    if (!email || !password || !firstName || !lastName || !adminCode) {
      throw new Error("All fields are required");
    }

    // Validate admin code server-side - SECURE
    const validAdminCode = Deno.env.get("ADMIN_CREATION_CODE");
    if (!validAdminCode || adminCode !== validAdminCode) {
      console.log("Invalid admin code attempt:", { email, timestamp: new Date().toISOString() });
      throw new Error("Invalid admin code");
    }

    // Rate limiting by IP
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const result = await withRateLimit(
      `admin:creation:${clientIP}`,
      { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 attempts per hour
      async () => {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );

        // Try to create admin user, handle existing user case
        let userId: string;
        let userExists = false;
        
        const { data: newUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin'
          }
        });

        if (signUpError) {
          if (signUpError.message?.includes('email') && 
              (signUpError.message?.includes('already') || signUpError.message?.includes('exists'))) {
            // User exists, try to get the existing user and complete setup
            userExists = true;
            let existingUser: any = null;
            let page = 1;
            const perPage = 1000;
            
            // Search through all pages to find the user
            while (!existingUser) {
              const { data: userPage, error: listError } = await supabaseClient.auth.admin.listUsers({
                page: page,
                perPage: perPage
              });
              
              if (listError) {
                console.error("Failed to list users:", listError);
                throw new Error("User exists but cannot retrieve user details");
              }
              
              existingUser = userPage.users.find(u => u.email === email);
              
              // If we found the user or there are no more pages, break
              if (existingUser || userPage.users.length < perPage) {
                break;
              }
              
              page++;
              
              // Safety limit to prevent infinite loops
              if (page > 100) {
                console.error("Exceeded pagination limit searching for user:", email);
                break;
              }
            }
            
            if (!existingUser) {
              throw new Error("User exists but cannot find user details in user list");
            }
            
            userId = existingUser.id;
            console.log("Found existing user, completing setup:", { email, userId, page });
            
            // Update existing user metadata to ensure it's current
            const { error: updateUserError } = await supabaseClient.auth.admin.updateUserById(userId, {
              user_metadata: {
                first_name: firstName,
                last_name: lastName,
                role: 'admin'
              }
            });
            
            if (updateUserError) {
              console.error("Failed to update existing user metadata:", updateUserError);
              // Don't fail completely, but log the issue
            }
          } else {
            console.error("Failed to create admin user:", signUpError);
            throw new Error(`Failed to create admin user: ${signUpError.message}`);
          }
        } else {
          if (!newUser.user) {
            throw new Error("Failed to create user - no user returned");
          }
          userId = newUser.user.id;
        }

        // Find or create organization idempotently
        let organization;
        
        // First, try to find existing organization
        const { data: existingOrg, error: orgFindError } = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('name', 'DriveLine Solutions')
          .single();

        if (existingOrg && !orgFindError) {
          organization = existingOrg;
          console.log("Using existing organization:", organization.id);
        } else {
          // Try to create new organization
          const { data: newOrg, error: orgCreateError } = await supabaseClient
            .from('organizations')
            .insert({
              name: 'DriveLine Solutions',
              subscription_tier: 'unlimited',
              subscription_status: 'active',
              settings: {
                branding: {
                  company_name: 'DriveLine Solutions',
                  primary_color: '#667eea',
                  logo_url: null
                },
                features: {
                  unlimited_usage: true,
                  priority_support: true,
                  custom_integrations: true,
                  advanced_analytics: true
                }
              }
            })
            .select()
            .single();

          if (orgCreateError) {
            // If insert failed due to unique constraint, try to find it again
            if (orgCreateError.message?.includes('duplicate') || 
                orgCreateError.message?.includes('unique') ||
                orgCreateError.message?.includes('already exists')) {
              
              const { data: retryOrg, error: retryError } = await supabaseClient
                .from('organizations')
                .select('*')
                .eq('name', 'DriveLine Solutions')
                .single();
                
              if (retryOrg && !retryError) {
                organization = retryOrg;
                console.log("Found organization after unique constraint error:", organization.id);
              } else {
                console.error("Failed to find organization after unique constraint:", retryError);
                throw new Error("Failed to resolve organization");
              }
            } else {
              console.error("Failed to create organization:", orgCreateError);
              throw new Error(`Failed to create organization: ${orgCreateError.message}`);
            }
          } else {
            organization = newOrg;
            console.log("Created new organization:", organization.id);
          }
        }

        // Upsert profile to ensure it's correct (create or update)
        const { error: profileUpsertError } = await supabaseClient
          .from('profiles')
          .upsert({
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            organization_id: organization.id,
            role: 'admin'
          }, {
            onConflict: 'user_id'
          });

        if (profileUpsertError) {
          console.error("Failed to upsert profile:", profileUpsertError);
          throw new Error(`Failed to upsert profile: ${profileUpsertError.message}`);
        }
        
        console.log("Profile upserted successfully for user:", userId);

        return {
          success: true,
          userId: userId,
          userExists: userExists,
          organization: organization,
          message: userExists ? "Existing user setup completed" : "New admin user created"
        };
      }
    );

    return addCorsHeaders(
      new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  } catch (error) {
    console.error("Error creating admin user:", error);
    
    // Return appropriate status code for rate limiting
    const statusCode = (error as any).statusCode === 429 ? 429 : 500;
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});