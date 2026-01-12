import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { points } = await req.json();
    
    if (!points || isNaN(parseInt(points))) {
      throw new Error("Invalid points value");
    }

    const pointsToAdd = parseInt(points);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log(`[CONFIRM-SP] Adding ${pointsToAdd} SP to user ${user.id}`);

    // Get current shop points
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("shop_points")
      .eq("user_id", user.id)
      .single();

    const currentPoints = profile?.shop_points || 0;

    // Update shop points
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ shop_points: currentPoints + pointsToAdd })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Record purchase
    await supabaseClient.from("shop_purchases").insert({
      user_id: user.id,
      item_type: "shop_points_purchase",
      item_name: `${pointsToAdd} Shop Points`,
      points_spent: 0,
    });

    console.log(`[CONFIRM-SP] Successfully added ${pointsToAdd} SP to user ${user.id}`);

    return new Response(JSON.stringify({ success: true, new_total: currentPoints + pointsToAdd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CONFIRM-SP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
