import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating inactive state");
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: 'inactive',
        plan_type: null,
        current_period_start: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: 'inactive',
        plan_type: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let subscriptionData = {
      subscribed: false,
      status: 'inactive' as string,
      plan_type: null as string | null,
      current_period_start: null as string | null,
      current_period_end: null as string | null,
      stripe_customer_id: customerId,
      stripe_subscription_id: null as string | null,
    };

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0].price.id;
      const amount = subscription.items.data[0].price.unit_amount || 0;
      
      // Determine plan type based on amount and price ID
      let planType = 'starter';
      let isIntroPrice = false;
      
      // Enhanced plan detection with intro and standard pricing support
      if (amount >= 99000 && amount <= 120000) {
        planType = 'enterprise';
        isIntroPrice = amount === 99000;
      } else if (amount >= 35000 && amount <= 49900) {
        planType = 'pro';
        isIntroPrice = amount === 35000;
      } else {
        planType = 'starter';
        isIntroPrice = amount === 15000;
      }
      
      subscriptionData = {
        subscribed: true,
        status: subscription.status,
        plan_type: planType,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      };
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        planType,
        endDate: subscriptionData.current_period_end 
      });
    } else {
      logStep("No active subscription found");
    }

    // Update local database
    await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      ...subscriptionData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    logStep("Updated database with subscription info", { 
      subscribed: subscriptionData.subscribed, 
      planType: subscriptionData.plan_type 
    });

    return new Response(JSON.stringify({
      subscribed: subscriptionData.subscribed,
      status: subscriptionData.status,
      plan_type: subscriptionData.plan_type,
      current_period_end: subscriptionData.current_period_end,
      stripe_price_id: subscriptions.data.length > 0 ? subscriptions.data[0].items.data[0].price.id : null,
      intro_period_active: subscriptions.data.length > 0 ? isIntroPrice : false,
      intro_cycles_remaining: subscriptions.data.length > 0 && isIntroPrice ? 3 : 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});