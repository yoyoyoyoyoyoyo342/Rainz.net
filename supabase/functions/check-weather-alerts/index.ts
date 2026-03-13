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

    // Get all users with push subscriptions and notification preferences
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .limit(500);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No push subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
    let alertsSent = 0;

    for (const userId of uniqueUserIds) {
      // Get user's primary location
      const { data: locations } = await supabase
        .from("saved_locations")
        .select("latitude, longitude, name")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .limit(1);

      if (!locations || locations.length === 0) continue;
      const loc = locations[0];

      // Check user's notification preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("notify_severe_weather, notify_daily_summary")
        .eq("user_id", userId)
        .single();

      if (!profile?.notify_severe_weather) continue;

      // Fetch current weather for rain/severe alerts
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=precipitation,weathercode&hourly=precipitation_probability&forecast_hours=3&timezone=auto`;
        const resp = await fetch(weatherUrl);
        const weather = await resp.json();

        if (!weather.current) continue;

        const currentPrecip = weather.current.precipitation || 0;
        const weatherCode = weather.current.weathercode || 0;

        // Check upcoming rain probability (next 1-3 hours)
        const hourlyProbs = weather.hourly?.precipitation_probability || [];
        const upcomingRainProb = Math.max(...hourlyProbs.slice(0, 3));

        // Send alert if rain is imminent (>70% chance in next 3 hours)
        if (upcomingRainProb >= 70 && currentPrecip === 0) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title: "🌧️ Rain Alert",
              body: `Rain likely within the next 3 hours in ${loc.name} (${upcomingRainProb}% chance). Grab an umbrella!`,
              data: { type: "rain_alert" },
            },
          });
          alertsSent++;
        }

        // Send alert for severe weather (codes 95-99 = thunderstorm)
        if (weatherCode >= 95) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title: "⚠️ Severe Weather Warning",
              body: `Severe weather detected in ${loc.name}. Stay safe and check the forecast.`,
              data: { type: "severe_weather" },
            },
          });
          alertsSent++;
        }
      } catch (weatherErr) {
        console.error(`Weather fetch failed for user ${userId}:`, weatherErr);
      }
    }

    console.log(`Weather alerts check complete. ${alertsSent} alerts sent.`);

    return new Response(
      JSON.stringify({ success: true, alertsSent }),
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
