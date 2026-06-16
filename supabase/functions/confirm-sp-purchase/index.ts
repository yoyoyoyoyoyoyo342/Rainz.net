import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Missing sessionId");
    }

    // Require authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Unauthorized");
    const user = userData.user;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }
    const pointsToAdd = parseInt(session.metadata?.points ?? "0", 10);
    if (!pointsToAdd || pointsToAdd <= 0) throw new Error("Invalid points metadata");

    // Replay-prevention: ensure this session hasn't already been consumed
    const { data: existing } = await adminClient
      .from("shop_purchases")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_consumed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Atomically credit points
    const { data: profile } = await adminClient
      .from("profiles")
      .select("shop_points")
      .eq("user_id", user.id)
      .single();
    const currentPoints = profile?.shop_points || 0;

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ shop_points: currentPoints + pointsToAdd })
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    await adminClient.from("shop_purchases").insert({
      user_id: user.id,
      item_type: "shop_points_purchase",
      item_name: `${pointsToAdd} Shop Points`,
      points_spent: 0,
      stripe_session_id: sessionId,
    });

    console.log(`[CONFIRM-SP] Verified+credited ${pointsToAdd} SP to ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, new_total: currentPoints + pointsToAdd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[CONFIRM-SP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
