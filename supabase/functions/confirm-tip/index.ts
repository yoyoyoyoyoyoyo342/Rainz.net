import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("Missing session_id");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the session to verify payment
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Check if this tip was already recorded
    const { data: existingTip } = await supabase
      .from("tip_jar")
      .select("id")
      .eq("id", session_id)
      .maybeSingle();

    if (existingTip) {
      return new Response(JSON.stringify({ success: true, message: "Tip already recorded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const amountCents = session.metadata?.amount_cents ? parseInt(session.metadata.amount_cents) : session.amount_total;
    const userId = session.metadata?.user_id !== "anonymous" ? session.metadata?.user_id : null;

    // Record the tip
    const { error: insertError } = await supabase
      .from("tip_jar")
      .insert({
        id: session_id,
        user_id: userId,
        amount_cents: amountCents,
        message: null,
      });

    if (insertError) {
      console.error("Error inserting tip:", insertError);
      throw insertError;
    }

    console.log(`Tip recorded: ${amountCents} cents from user ${userId || "anonymous"}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error confirming tip:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
