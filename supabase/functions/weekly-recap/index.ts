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
    const supabase = createClient(supabaseUrl, serviceKey);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString();

    // Get all users who have notification enabled
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, display_name, notification_enabled")
      .eq("notification_enabled", true);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const user of users) {
      // Get predictions in the last 7 days
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("is_verified, is_correct, points_earned")
        .eq("user_id", user.user_id)
        .gte("created_at", since);

      const total = predictions?.length || 0;
      if (total === 0) continue; // Skip users who didn't predict

      const verified = predictions?.filter(p => p.is_verified) || [];
      const correct = verified.filter(p => p.is_correct).length;
      const accuracy = verified.length > 0 ? Math.round((correct / verified.length) * 100) : 0;
      const pointsEarned = predictions?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;

      // Get current streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.user_id)
        .maybeSingle();

      const streak = streakData?.current_streak || 0;

      // Create in-app notification
      const message = `📊 Weekly Recap: ${total} predictions, ${accuracy}% accuracy, ${pointsEarned > 0 ? "+" : ""}${pointsEarned} points${streak > 0 ? `, ${streak}-day streak 🔥` : ""}`;

      await supabase.from("user_notifications").insert({
        user_id: user.user_id,
        type: "weekly_recap",
        title: "Your Weekly Weather Recap",
        message,
        metadata: { total, accuracy, pointsEarned, streak },
      });

      sentCount++;
    }

    console.log(`Weekly recap sent to ${sentCount} users`);

    return new Response(
      JSON.stringify({ success: true, sentCount }),
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
