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
    const { amountCents } = await req.json();
    
    if (!amountCents || amountCents < 100) {
      throw new Error("Invalid tip amount");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Initialize Supabase with service role for inserting tips
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user if authenticated (optional for tips)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id || null;
    }

    const origin = req.headers.get("origin") || "https://rainz.lovable.app";

    // Create a one-time payment session for the tip
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Support Rainz",
              description: "Thank you for supporting Rainz! ❤️",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?tip=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?tip=cancelled`,
      metadata: {
        type: "tip",
        user_id: userId || "anonymous",
        amount_cents: amountCents.toString(),
      },
    });

    // Record the tip as pending with session ID - will be confirmed on success
    await supabase.from("tip_jar").insert({
      user_id: userId,
      amount_cents: amountCents,
      message: null,
      status: "pending",
      stripe_session_id: session.id,
    });

    console.log(`Created tip checkout session ${session.id} for ${amountCents} cents, user: ${userId || "anonymous"}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating tip checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
