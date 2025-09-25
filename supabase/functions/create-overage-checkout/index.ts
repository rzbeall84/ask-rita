import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Overage pack configurations with exact Stripe price IDs
const OVERAGE_PACKS = {
  pack_1000: {
    priceId: "price_1SBJBRDlNVaqt2O2vs6qpHmZ",
    queries: 1000,
    amount: 25,
    name: "1,000 Query Pack"
  },
  pack_5000: {
    priceId: "price_1SBJCgDlNVaqt2O2ICsWmiEJ", 
    queries: 5000,
    amount: 90,
    name: "5,000 Query Pack"
  },
  pack_10000: {
    priceId: "price_1SBJDCDlNVaqt2O2zI8Cdabb",
    queries: 10000,
    amount: 150,
    name: "10,000 Query Pack"
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("User organization not found");
    }

    const { packType } = await req.json();
    if (!packType || !OVERAGE_PACKS[packType as keyof typeof OVERAGE_PACKS]) {
      throw new Error("Invalid pack type");
    }

    const pack = OVERAGE_PACKS[packType as keyof typeof OVERAGE_PACKS];
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    let customerId;
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
          organization_id: profile.organization_id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session for overage pack
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: pack.priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment for overage packs
      success_url: `${Deno.env.get("PUBLIC_SITE_URL") || "https://askrita.org"}/billing?success=overage`,
      cancel_url: `${Deno.env.get("PUBLIC_SITE_URL") || "https://askrita.org"}/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        organization_id: profile.organization_id,
        pack_type: packType,
        queries_added: pack.queries.toString(),
      },
    });

    console.log(`Created overage pack checkout session: ${session.id} for ${pack.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sessionId: session.id,
        url: session.url,
        pack: {
          name: pack.name,
          queries: pack.queries,
          amount: pack.amount
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error creating overage checkout:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});