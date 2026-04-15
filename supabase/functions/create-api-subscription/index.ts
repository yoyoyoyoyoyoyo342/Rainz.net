import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-API-SUBSCRIPTION] ${step}${detailsStr}`);
};

const TIER_CONFIG: Record<string, { lookupKey: string; name: string; unitAmount: number; dailyLimit: number }> = {
  pro: {
    lookupKey: "rainz_api_pro",
    name: "Rainz API Pro",
    unitAmount: 900, // €9.00
    dailyLimit: 10000,
  },
  business: {
    lookupKey: "rainz_api_business",
    name: "Rainz API Business",
    unitAmount: 4900, // €49.00
    dailyLimit: -1, // unlimited
  },
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier = "pro" } = await req.json().catch(() => ({ tier: "pro" }));
    const tierConfig = TIER_CONFIG[tier];
    if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);
    logStep("Tier selected", { tier, config: tierConfig });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }
    logStep("Customer resolved", { customerId });

    // Find or create the price for this tier
    const prices = await stripe.prices.list({ lookup_keys: [tierConfig.lookupKey], limit: 1 });
    let priceId: string;

    if (prices.data.length > 0) {
      priceId = prices.data[0].id;
    } else {
      const product = await stripe.products.create({
        name: tierConfig.name,
        description: `Rainz Weather API - ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`,
      });
      const price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: tierConfig.unitAmount,
        recurring: { interval: "month" },
        lookup_key: tierConfig.lookupKey,
      });
      priceId = price.id;
      logStep("Created new price", { priceId, productId: product.id });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/api?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/api?subscription=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          api_tier: tier,
          daily_limit: String(tierConfig.dailyLimit),
        },
      },
    });

    // Upsert the subscription record (will be confirmed by webhook in production)
    await supabaseClient.from("api_subscriptions").upsert(
      {
        user_id: user.id,
        tier: tier,
        daily_limit: tierConfig.dailyLimit === -1 ? 999999999 : tierConfig.dailyLimit,
      },
      { onConflict: "user_id" }
    );

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
