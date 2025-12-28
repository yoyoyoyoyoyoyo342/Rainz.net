import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPORT-API-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { api_key, endpoint, quantity = 1 } = await req.json();
    
    if (!api_key) throw new Error("API key is required");
    logStep("Processing usage report", { api_key: api_key.substring(0, 8) + '...', endpoint, quantity });

    // Look up the API key to get user and subscription info
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('*')
      .eq('api_key', api_key)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      throw new Error("Invalid or inactive API key");
    }

    logStep("API key found", { userId: apiKeyData.user_id, subscriptionId: apiKeyData.stripe_subscription_id });

    // Record usage in our database
    await supabaseClient.from('api_usage').insert({
      user_id: apiKeyData.user_id,
      api_key: api_key,
      endpoint: endpoint || 'unknown',
      response_status: 200
    });

    // If user has a Stripe subscription, report usage to Stripe
    if (apiKeyData.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Get the subscription to find the subscription item
      const subscription = await stripe.subscriptions.retrieve(apiKeyData.stripe_subscription_id);
      
      if (subscription.status === 'active') {
        const subscriptionItemId = subscription.items.data[0]?.id;
        
        if (subscriptionItemId) {
          // Report usage to Stripe
          await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
            quantity: quantity,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment'
          });
          
          logStep("Usage reported to Stripe", { subscriptionItemId, quantity });
        }
      } else {
        logStep("Subscription not active", { status: subscription.status });
      }
    } else {
      logStep("No Stripe subscription - usage recorded locally only");
    }

    // Update last_used_at on the API key
    await supabaseClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});