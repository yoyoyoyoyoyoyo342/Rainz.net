import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const requester = userData.user;
    if (!requester?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: requester.id });

    // Optional: check a different user's subscription (used for leaderboard badges)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = typeof body?.check_user_id === "string" ? body.check_user_id : null;
    } catch {
      // No body is fine
    }

    const userIdToCheck = targetUserId || requester.id;
    logStep("Checking subscription for user", { userIdToCheck });

    // First check for active premium_grants (admin-granted free premium)
    const { data: premiumGrant, error: grantError } = await supabaseClient
      .from("premium_grants")
      .select("id, expires_at, reason")
      .eq("user_id", userIdToCheck)
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt.now()")
      .limit(1)
      .maybeSingle();

    if (!grantError && premiumGrant) {
      logStep("Active premium grant found", { grantId: premiumGrant.id, reason: premiumGrant.reason });
      return new Response(
        JSON.stringify({
          subscribed: true,
          product_id: "premium_grant",
          subscription_end: premiumGrant.expires_at,
          grant_reason: premiumGrant.reason,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If no premium grant, check Stripe subscription
    let emailToCheck: string | null = null;

    if (userIdToCheck === requester.id) {
      emailToCheck = requester.email ?? null;
    } else {
      const { data: adminUser, error: adminErr } = await supabaseClient.auth.admin.getUserById(userIdToCheck);
      if (adminErr) {
        logStep("Failed to fetch user via admin API", { userIdToCheck });
      }
      emailToCheck = adminUser?.user?.email ?? null;
    }

    if (!emailToCheck) {
      logStep("No email available for user; returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      if (subscription.current_period_end) {
        try {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        } catch {
          subscriptionEnd = null;
        }
      }

      const priceItem = subscription.items?.data?.[0];
      if (priceItem?.price?.product) {
        const priceProduct = priceItem.price.product;
        productId = typeof priceProduct === "string" ? priceProduct : priceProduct.id;
      }
      logStep("Active Stripe subscription found", { productId, subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        product_id: productId,
        subscription_end: subscriptionEnd,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
