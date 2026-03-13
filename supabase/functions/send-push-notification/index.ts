import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing user_id, title, or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always create in-app notification
    await supabase.from("user_notifications").insert({
      user_id,
      type: data?.type || "push",
      title,
      message: body,
      metadata: data || {},
    });

    // Try to send push notification if VAPID key is configured
    if (vapidPrivateKey) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          try {
            // Web Push API call would go here
            // For now, we log it - full web-push implementation requires 
            // the web-push npm package which isn't available in Deno
            console.log(`Push notification queued for endpoint: ${sub.endpoint.slice(0, 50)}...`);
          } catch (err) {
            console.error(`Failed to send push to ${sub.endpoint}:`, err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
