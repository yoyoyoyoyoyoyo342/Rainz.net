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

    const nowUtc = new Date();
    const currentHour = nowUtc.getUTCHours();
    const hourStr = `${String(currentHour).padStart(2, "0")}:`;

    // Get all users with push subscriptions who have notifications enabled
    // and whose notification_time hour matches the current UTC hour
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id, notification_enabled, notification_time")
      .eq("notification_enabled", true);

    if (profilesErr) {
      console.error("Error fetching profiles:", profilesErr);
      return new Response(JSON.stringify({ error: profilesErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter users whose notification_time hour matches current UTC hour
    const matchingUsers = (profiles || []).filter((p) => {
      if (!p.notification_time) return currentHour === 8; // default 08:00
      return p.notification_time.startsWith(hourStr);
    });

    if (matchingUsers.length === 0) {
      console.log(`No users scheduled for hour ${currentHour} UTC`);
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = matchingUsers.map((u) => u.user_id);

    // Check which of these users actually have push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", userIds);

    const subscribedUserIds = [...new Set((subs || []).map((s) => s.user_id))];

    if (subscribedUserIds.length === 0) {
      console.log("No subscribed users for this hour");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch fetch preferences and primary locations
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("user_id, language, premium_settings")
      .in("user_id", subscribedUserIds);

    const { data: locations } = await supabase
      .from("saved_locations")
      .select("user_id, name, latitude, longitude")
      .in("user_id", subscribedUserIds)
      .eq("is_primary", true);

    const prefMap = new Map((preferences || []).map((p) => [p.user_id, p]));
    const locMap = new Map((locations || []).map((l) => [l.user_id, l]));

    let sent = 0;
    let failed = 0;

    for (const userId of subscribedUserIds) {
      try {
        const pref = prefMap.get(userId);
        const loc = locMap.get(userId);
        const language = pref?.language || "en";
        const premiumSettings = (pref?.premium_settings as Record<string, unknown>) || {};
        const useCelsius = premiumSettings?.temperatureUnit === "celsius";

        let title = language === "no" ? "God morgen! ☀️" : "Good Morning! ☀️";
        let body = language === "no"
          ? "Sjekk værvarsel for i dag."
          : "Check your weather forecast for today.";

        // If user has a primary location, fetch weather and build a richer message
        if (loc) {
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
            );
            const weather = await weatherRes.json();

            if (weather?.current) {
              let temp = weather.current.temperature_2m;
              const unit = useCelsius ? "°C" : "°F";
              if (!useCelsius) temp = Math.round(temp * 9 / 5 + 32);
              else temp = Math.round(temp);

              let high = weather.daily?.temperature_2m_max?.[0];
              let low = weather.daily?.temperature_2m_min?.[0];
              if (!useCelsius) {
                high = high != null ? Math.round(high * 9 / 5 + 32) : null;
                low = low != null ? Math.round(low * 9 / 5 + 32) : null;
              } else {
                high = high != null ? Math.round(high) : null;
                low = low != null ? Math.round(low) : null;
              }

              const weatherCode = weather.current.weather_code || 0;
              const condition = getConditionText(weatherCode, language);

              if (language === "no") {
                body = `${loc.name}: ${temp}${unit}, ${condition}`;
                if (high != null && low != null) body += ` (H: ${high}${unit} L: ${low}${unit})`;
              } else {
                body = `${loc.name}: ${temp}${unit}, ${condition}`;
                if (high != null && low != null) body += ` (H: ${high}${unit} L: ${low}${unit})`;
              }
            }
          } catch (weatherErr) {
            console.error(`Weather fetch failed for ${userId}:`, weatherErr);
          }
        }

        // Call send-push-notification for this user
        const { error: pushErr } = await supabase.functions.invoke("send-push-notification", {
          body: { user_id: userId, title, body, data: { type: "daily_summary" } },
        });

        if (pushErr) {
          console.error(`Push failed for ${userId}:`, pushErr);
          failed++;
        } else {
          sent++;
        }
      } catch (userErr) {
        console.error(`Error processing user ${userId}:`, userErr);
        failed++;
      }
    }

    console.log(`Daily notifications: sent=${sent}, failed=${failed}`);
    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getConditionText(code: number, lang: string): string {
  const conditions: Record<number, [string, string]> = {
    0: ["Clear sky", "Klar himmel"],
    1: ["Mostly clear", "Delvis klart"],
    2: ["Partly cloudy", "Delvis skyet"],
    3: ["Overcast", "Overskyet"],
    45: ["Foggy", "Tåke"],
    48: ["Rime fog", "Rimtåke"],
    51: ["Light drizzle", "Lett yr"],
    53: ["Drizzle", "Yr"],
    55: ["Heavy drizzle", "Kraftig yr"],
    61: ["Light rain", "Lett regn"],
    63: ["Rain", "Regn"],
    65: ["Heavy rain", "Kraftig regn"],
    71: ["Light snow", "Lett snø"],
    73: ["Snow", "Snø"],
    75: ["Heavy snow", "Kraftig snø"],
    80: ["Rain showers", "Regnbyger"],
    95: ["Thunderstorm", "Tordenvær"],
  };
  const entry = conditions[code] || conditions[0];
  return lang === "no" ? entry[1] : entry[0];
}
