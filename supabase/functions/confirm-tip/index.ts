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
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the Stripe session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log(`Verifying tip session ${sessionId}, status: ${session.payment_status}`);

    if (session.payment_status === "paid") {
      // Update the tip status to completed
      const { data, error } = await supabase
        .from("tip_jar")
        .update({ status: "completed" })
        .eq("stripe_session_id", sessionId)
        .eq("status", "pending")
        .select()
        .single();

      if (error) {
        console.error("Error updating tip:", error);
        // Still return success if already confirmed
        return new Response(JSON.stringify({ 
          confirmed: true, 
          message: "Tip already confirmed or session not found",
          amount_cents: session.amount_total
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log(`Confirmed tip: ${data?.amount_cents} cents`);

      return new Response(JSON.stringify({ 
        confirmed: true,
        amount_cents: data?.amount_cents || session.amount_total
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Payment not completed
      return new Response(JSON.stringify({ 
        confirmed: false,
        message: "Payment not completed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error: any) {
    console.error("Error confirming tip:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
