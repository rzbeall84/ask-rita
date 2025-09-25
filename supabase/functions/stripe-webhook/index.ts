import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLAN_LIMITS = {
  starter: { users: 3, queries: 1500, storage: 20 },
  pro: { users: -1, queries: 5000, storage: 100 },
  enterprise: { users: -1, queries: 15000, storage: 500 },
  free: { users: 2, queries: 100, storage: 5 },
};

const GRACE_PERIOD_DAYS = 3;

// Helper function to log webhook events
async function logWebhookEvent(
  supabaseClient: any,
  eventType: string,
  eventData: any,
  status: 'success' | 'error',
  message?: string
) {
  try {
    await supabaseClient.from('webhook_logs').insert({
      webhook_type: 'stripe',
      event_type: eventType,
      event_data: eventData,
      status: status,
      message: message,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

// Helper to determine plan type from price ID - supports both intro and regular pricing
function getPlanTypeFromPriceId(priceId: string): string {
  // Starter plan price IDs
  if (priceId === 'price_1S6I6GDlNVaqt2O2yJ9SPdLv') return 'starter'; // Intro $150
  if (priceId === 'price_1S3iqzDlNVaqt2O2qStAeSXl') return 'starter'; // Regular $199
  
  // Pro plan price IDs  
  if (priceId === 'price_1S6I76DlNVaqt2O2BOXXDRnc') return 'pro'; // Intro $350
  if (priceId === 'price_1S3it7DlNVaqt2O2BUr5aIBy') return 'pro'; // Regular $499
  
  // Enterprise plan price IDs
  if (priceId === 'price_1S6I7eDlNVaqt2O2LeKNOhWb') return 'enterprise'; // Intro $990
  if (priceId === 'price_1S6I7pDlNVaqt2O2uaAKShfC') return 'enterprise'; // Regular $1200
  
  return 'free';
}

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe keys not configured");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe signature found");
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      await logWebhookEvent(supabaseClient, 'signature_verification_failed', { error: err }, 'error', 'Invalid signature');
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);
    await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', `Processing ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.supabase_user_id;
          const organizationId = session.metadata?.organization_id;
          
          if (!userId || !organizationId) {
            console.error("Missing metadata in checkout session");
            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', 'Missing metadata');
            break;
          }

          // Check if this is an overage pack purchase
          const packType = session.metadata?.pack_type;
          const queriesAdded = session.metadata?.queries_added;
          
          if (packType && queriesAdded) {
            // Handle overage pack purchase
            const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
            const addedQueries = parseInt(queriesAdded);
            
            // Get current usage or create new record
            const { data: currentUsage, error: usageError } = await supabaseClient
              .from('query_usage')
              .select('*')
              .eq('org_id', organizationId)
              .eq('month', currentMonth)
              .single();
            
            if (usageError && usageError.code !== 'PGRST116') {
              console.error('Error fetching usage:', usageError);
            }
            
            const currentExtra = currentUsage?.extra_queries_purchased || 0;
            
            // Update or create usage record with additional queries
            await supabaseClient.from('query_usage').upsert({
              org_id: organizationId,
              month: currentMonth,
              queries_used: currentUsage?.queries_used || 0,
              extra_queries_purchased: currentExtra + addedQueries,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id,month' });
            
            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', `Overage pack purchased: ${addedQueries} queries`);
            
          } else if (session.subscription) {
            // Handle subscription purchase
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = subscription.items.data[0]?.price.id;
            const planType = getPlanTypeFromPriceId(priceId);
            const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

            // Update subscription in database
            await supabaseClient.from('subscriptions').upsert({
              user_id: userId,
              organization_id: organizationId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              status: subscription.status,
              plan_type: planType,
              query_limit: limits.queries,
              queries_used: 0,
              queries_reset_at: new Date(subscription.current_period_end * 1000).toISOString(),
              storage_limit_gb: limits.storage,
              storage_used_gb: 0,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              grace_period_end: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            // Update organization limits
            await supabaseClient.from('organizations').update({
              user_limit: limits.users,
              query_limit: limits.queries,
              monthly_query_cap: limits.queries,
              updated_at: new Date().toISOString(),
            }).eq('id', organizationId);

            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Subscription created');
          }
          
        } catch (error) {
          console.error('Error processing checkout.session.completed:', error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        try {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.supabase_user_id;
          const organizationId = subscription.metadata?.organization_id;

          if (!userId || !organizationId) {
            console.error("Missing metadata in subscription");
            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', 'Missing metadata');
            break;
          }

          const priceId = subscription.items.data[0]?.price.id;
          const planType = getPlanTypeFromPriceId(priceId);
          const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

          // Clear grace period if subscription is active
          const gracePeriodEnd = subscription.status === 'active' ? null : undefined;

          await supabaseClient.from('subscriptions').upsert({
            user_id: userId,
            organization_id: organizationId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            status: subscription.status,
            plan_type: planType,
            query_limit: limits.queries,
            storage_limit_gb: limits.storage,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            ...(gracePeriodEnd !== undefined && { grace_period_end: gracePeriodEnd }),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          // Update organization limits
          await supabaseClient.from('organizations').update({
            user_limit: limits.users,
            query_limit: limits.queries,
            monthly_query_cap: limits.queries,
            updated_at: new Date().toISOString(),
          }).eq('id', organizationId);

          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Subscription updated');
        } catch (error) {
          console.error(`Error processing ${event.type}:`, error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        try {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.supabase_user_id;
          const organizationId = subscription.metadata?.organization_id;

          if (!userId || !organizationId) {
            console.error("Missing metadata in canceled subscription");
            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', 'Missing metadata');
            break;
          }

          // Calculate grace period end date
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

          // Update subscription status to canceled with grace period
          await supabaseClient.from('subscriptions').update({
            status: 'canceled',
            grace_period_end: gracePeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId);

          // Keep current limits during grace period
          // They will be reset after grace period expires

          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Subscription canceled with grace period');
        } catch (error) {
          console.error('Error processing customer.subscription.deleted:', error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        try {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;
          
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.supabase_user_id;
            const organizationId = subscription.metadata?.organization_id;
            
            if (userId && organizationId) {
              // Reset query usage in subscriptions table
              await supabaseClient.from('subscriptions').update({
                queries_used: 0,
                queries_reset_at: new Date(subscription.current_period_end * 1000).toISOString(),
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                status: 'active',
                grace_period_end: null, // Clear any grace period
                updated_at: new Date().toISOString(),
              }).eq('user_id', userId);

              // Reset monthly query usage in query_usage table
              const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
              await supabaseClient.from('query_usage').upsert({
                org_id: organizationId,
                month: currentMonth,
                queries_used: 0,
                extra_queries_purchased: 0, // Reset overage packs
                last_notification_80: null,
                last_notification_100: null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'org_id,month' });

              await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Payment succeeded and usage reset');
            }
          }
        } catch (error) {
          console.error('Error processing invoice.payment_succeeded:', error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        try {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;
          
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.supabase_user_id;
            
            if (userId) {
              // Calculate grace period end date
              const gracePeriodEnd = new Date();
              gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

              await supabaseClient.from('subscriptions').update({
                status: 'past_due',
                grace_period_end: gracePeriodEnd.toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('user_id', userId);

              await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Payment failed, grace period started');
            }
          }
        } catch (error) {
          console.error('Error processing invoice.payment_failed:', error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'customer.updated': {
        try {
          const customer = event.data.object as Stripe.Customer;
          
          // Update customer information if needed
          if (customer.metadata?.supabase_user_id) {
            await supabaseClient.from('subscriptions').update({
              stripe_customer_email: customer.email,
              updated_at: new Date().toISOString(),
            }).eq('stripe_customer_id', customer.id);

            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Customer updated');
          }
        } catch (error) {
          console.error('Error processing customer.updated:', error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      case 'payment_method.attached':
      case 'payment_method.updated': {
        try {
          const paymentMethod = event.data.object as Stripe.PaymentMethod;
          
          if (paymentMethod.customer) {
            // Log payment method update
            await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Payment method updated');
          }
        } catch (error) {
          console.error(`Error processing ${event.type}:`, error);
          await logWebhookEvent(supabaseClient, event.type, event.data.object, 'error', error.message);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        await logWebhookEvent(supabaseClient, event.type, event.data.object, 'success', 'Event received but not processed');
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    await logWebhookEvent(supabaseClient, 'webhook_error', { error: error.message }, 'error', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});