import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    // Get all users with push subscriptions
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
    let dailySent = 0;

    for (const userId of uniqueUserIds) {
      // Get user's notification preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("notify_severe_weather, notify_daily_summary, notify_pollen, notification_enabled, notification_time")
        .eq("user_id", userId)
        .single();

      // Skip if notifications are globally disabled
      if (!profile?.notification_enabled) continue;

      // Get user's primary location
      const { data: locations } = await supabase
        .from("saved_locations")
        .select("latitude, longitude, name")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .limit(1);

      if (!locations || locations.length === 0) continue;
      const loc = locations[0];

      // Fetch current weather for alerts
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=precipitation,weathercode,temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=precipitation_probability,temperature_2m&forecast_hours=6&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=1&timezone=auto`;
        const resp = await fetch(weatherUrl);
        const weather = await resp.json();

        if (!weather.current) continue;

        const currentPrecip = weather.current.precipitation || 0;
        const weatherCode = weather.current.weathercode || 0;
        const currentTemp = weather.current.temperature_2m;

        // === RAIN ALERTS ===
        if (profile.notify_severe_weather) {
          const hourlyProbs = weather.hourly?.precipitation_probability || [];
          const upcomingRainProb = Math.max(...hourlyProbs.slice(0, 3));

          // Rain imminent (>70% chance in next 3 hours, not currently raining)
          if (upcomingRainProb >= 70 && currentPrecip === 0) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: userId,
                title: "🌧️ Rain Alert",
                body: `Rain likely within 3 hours in ${loc.name} (${upcomingRainProb}% chance). Grab an umbrella!`,
                data: { type: "rain_alert", location: loc.name },
              },
            });
            alertsSent++;
          }

          // Severe weather (thunderstorm codes 95-99)
          if (weatherCode >= 95) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: userId,
                title: "⚠️ Severe Weather Warning",
                body: `Severe weather detected in ${loc.name}. Stay safe and check the forecast.`,
                data: { type: "severe_weather", location: loc.name },
              },
            });
            alertsSent++;
          }

          // Freezing conditions (below 0°C / 32°F)
          if (currentTemp !== undefined && currentTemp <= 0) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: userId,
                title: "🥶 Freezing Alert",
                body: `Temperature is ${Math.round(currentTemp)}°C in ${loc.name}. Watch for ice!`,
                data: { type: "freeze_alert", location: loc.name },
              },
            });
            alertsSent++;
          }

          // Extreme heat (above 35°C / 95°F)
          if (currentTemp !== undefined && currentTemp >= 35) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: userId,
                title: "🔥 Extreme Heat Warning",
                body: `Temperature is ${Math.round(currentTemp)}°C in ${loc.name}. Stay hydrated!`,
                data: { type: "heat_alert", location: loc.name },
              },
            });
            alertsSent++;
          }
        }

        // === DAILY SUMMARY (AI-generated mini morning briefing) ===
        if (profile.notify_daily_summary) {
          const now = new Date();
          const preferredTime = profile.notification_time || "08:00";
          const [prefHour] = preferredTime.split(":").map(Number);
          const currentHour = now.getUTCHours();

          if (Math.abs(currentHour - prefHour) <= 1) {
            const highTemp = weather.daily?.temperature_2m_max?.[0];
            const lowTemp = weather.daily?.temperature_2m_min?.[0];
            const dailyCode = weather.daily?.weathercode?.[0] || 0;
            const condition = getConditionFromCode(dailyCode);
            const hourlyTemps = weather.hourly?.temperature_2m?.slice(0, 6) || [];
            const hourlyProbs = weather.hourly?.precipitation_probability?.slice(0, 6) || [];
            const humidity = weather.current?.relative_humidity_2m;
            const windSpeed = weather.current?.wind_speed_10m;

            // Fetch pollen data for the summary
            let pollenInfo = "";
            try {
              const pollenUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=birch_pollen,grass_pollen,ragweed_pollen,alder_pollen`;
              const pollenResp = await fetch(pollenUrl);
              const pollenData = await pollenResp.json();
              if (pollenData.current) {
                const levels: string[] = [];
                if ((pollenData.current.grass_pollen || 0) > 50) levels.push("Grass pollen: high");
                if ((pollenData.current.birch_pollen || 0) > 50) levels.push("Birch pollen: high");
                if ((pollenData.current.ragweed_pollen || 0) > 20) levels.push("Ragweed pollen: high");
                if ((pollenData.current.alder_pollen || 0) > 50) levels.push("Alder pollen: high");
                if (levels.length > 0) pollenInfo = levels.join(", ");
              }
            } catch { /* pollen data optional */ }

            // Generate AI mini-summary via Groq
            let summaryBody = `${condition}. High: ${Math.round(highTemp)}°C, Low: ${Math.round(lowTemp)}°C.`;
            try {
              const aiSummary = await generateAIMiniSummary({
                location: loc.name,
                currentTemp: Math.round(currentTemp),
                highTemp: Math.round(highTemp),
                lowTemp: Math.round(lowTemp),
                condition,
                humidity,
                windSpeed,
                pollenInfo,
                rainChance: Math.max(...hourlyProbs, 0),
              });
              if (aiSummary) summaryBody = aiSummary;
            } catch (aiErr) {
              console.error(`AI summary generation failed for ${userId}:`, aiErr);
            }

            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: userId,
                title: `☀️ Good Morning, ${loc.name}`,
                body: summaryBody,
                data: { type: "daily_summary", location: loc.name },
              },
            });
            dailySent++;
          }
        }

        // === POLLEN ALERTS ===
        if (profile.notify_pollen) {
          // Pollen is seasonal - check if it's pollen season (March-September for northern hemisphere)
          const month = new Date().getMonth() + 1;
          if (month >= 3 && month <= 9) {
            // Use Open-Meteo air quality API for pollen data
            try {
              const pollenUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=birch_pollen,grass_pollen,ragweed_pollen,alder_pollen`;
              const pollenResp = await fetch(pollenUrl);
              const pollenData = await pollenResp.json();

              if (pollenData.current) {
                const highPollen: string[] = [];
                if ((pollenData.current.grass_pollen || 0) > 50) highPollen.push("Grass");
                if ((pollenData.current.birch_pollen || 0) > 50) highPollen.push("Birch");
                if ((pollenData.current.ragweed_pollen || 0) > 20) highPollen.push("Ragweed");
                if ((pollenData.current.alder_pollen || 0) > 50) highPollen.push("Alder");

                if (highPollen.length > 0) {
                  await supabase.functions.invoke("send-push-notification", {
                    body: {
                      user_id: userId,
                      title: "🤧 High Pollen Alert",
                      body: `High ${highPollen.join(", ")} pollen in ${loc.name}. Take precautions if you have allergies.`,
                      data: { type: "pollen_alert", location: loc.name, pollen: highPollen },
                    },
                  });
                  alertsSent++;
                }
              }
            } catch (pollenErr) {
              console.error(`Pollen fetch failed for user ${userId}:`, pollenErr);
            }
          }
        }
      } catch (weatherErr) {
        console.error(`Weather fetch failed for user ${userId}:`, weatherErr);
      }
    }

    console.log(`Weather alerts check complete. ${alertsSent} alerts sent, ${dailySent} daily summaries sent.`);

    return new Response(
      JSON.stringify({ success: true, alertsSent, dailySent }),
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

function getConditionFromCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Mixed conditions";
}
