import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shop Points packages with Stripe price IDs
const SP_PACKAGES = {
  sp_500: { priceId: "price_1SpM7z8mRhH1c6KOuli4lyNY", points: 500, name: "500 Shop Points" },
  sp_1200: { priceId: "price_1SpM8D8mRhH1c6KOYvTEYjsh", points: 1200, name: "1,200 Shop Points" },
  sp_3000: { priceId: "price_1SpM8O8mRhH1c6KOzdiEU1yC", points: 3000, name: "3,000 Shop Points" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { packageId } = await req.json();
    
    console.log(`[BUY-SP] Received request for package: ${packageId}`);
    
    if (!packageId || !SP_PACKAGES[packageId as keyof typeof SP_PACKAGES]) {
      console.log(`[BUY-SP] Invalid package ID: ${packageId}`);
      throw new Error("Invalid package ID");
    }

    const spPackage = SP_PACKAGES[packageId as keyof typeof SP_PACKAGES];
    console.log(`[BUY-SP] Package details: ${JSON.stringify(spPackage)}`);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[BUY-SP] No authorization header");
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.log(`[BUY-SP] Auth error: ${authError.message}`);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const user = data.user;
    
    if (!user?.email) {
      console.log("[BUY-SP] User not authenticated or email not available");
      throw new Error("User not authenticated or email not available");
    }

    console.log(`[BUY-SP] User ${user.email} purchasing ${spPackage.name}`);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.log("[BUY-SP] STRIPE_SECRET_KEY not set");
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`[BUY-SP] Found existing customer: ${customerId}`);
    } else {
      console.log("[BUY-SP] Creating new customer");
    }

    const origin = req.headers.get("origin") || "https://rainz.net";
    console.log(`[BUY-SP] Origin: ${origin}`);

    // Create checkout session using the Stripe price ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: spPackage.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?sp_purchase=success&points=${spPackage.points}`,
      cancel_url: `${origin}/?sp_purchase=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        points: spPackage.points.toString(),
      },
    });

    console.log(`[BUY-SP] Checkout session created: ${session.id}, URL: ${session.url}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[BUY-SP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
