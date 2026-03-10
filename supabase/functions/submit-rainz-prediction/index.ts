import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAINZ_BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

const ALL_LOCATIONS = [
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
];

function pickDailyLocation(dateStr: string) {
  // Use date string as seed for deterministic daily pick
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return ALL_LOCATIONS[Math.abs(hash) % ALL_LOCATIONS.length];
}

function pickConfidence(): number {
  const roll = Math.random();
  if (roll < 0.4) return 1;
  if (roll < 0.8) return 1.5;
  return 2.5;
}

const mapWeatherCode = (code: number): string => {
  if (code <= 1) return "sunny";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code >= 45 && code <= 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 63) return "rainy";
  if (code >= 65 && code <= 67) return "heavy-rain";
  if (code >= 71 && code <= 75) return "snowy";
  if (code === 77) return "snowy";
  if (code >= 80 && code <= 82) return "rainy";
  if (code >= 85 && code <= 86) return "heavy-snow";
  if (code >= 95) return "thunderstorm";
  return "cloudy";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const predictionDate = tomorrow.toISOString().split("T")[0];

    const results: any[] = [];

    for (const loc of LOCATIONS) {
      // Check if bot already predicted for this location + date
      const { data: existing } = await supabase
        .from("weather_predictions")
        .select("id")
        .eq("user_id", RAINZ_BOT_USER_ID)
        .eq("prediction_date", predictionDate)
        .eq("location_name", loc.name)
        .maybeSingle();

      if (existing) {
        results.push({ location: loc.name, status: "already_predicted" });
        continue;
      }

      // Fetch forecast
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=2`;
      const forecastRes = await fetch(forecastUrl);
      const forecastData = await forecastRes.json();

      const dailyData = forecastData?.daily;
      if (!dailyData || dailyData.temperature_2m_max.length < 2) {
        results.push({ location: loc.name, status: "forecast_failed" });
        continue;
      }

      const highC = Math.round(dailyData.temperature_2m_max[1]);
      const lowC = Math.round(dailyData.temperature_2m_min[1]);
      const weatherCode = dailyData.weathercode[1];
      const condition = mapWeatherCode(weatherCode);
      const confidence = pickConfidence();

      const { error } = await supabase.from("weather_predictions").insert({
        user_id: RAINZ_BOT_USER_ID,
        prediction_date: predictionDate,
        predicted_high: highC,
        predicted_low: lowC,
        predicted_condition: condition,
        confidence_multiplier: confidence,
        location_name: loc.name,
        latitude: loc.lat,
        longitude: loc.lon,
      });

      if (error) {
        results.push({ location: loc.name, status: "error", error: error.message });
      } else {
        console.log(`Rainz Bot predicted ${condition} ${lowC}-${highC}°C for ${loc.name} on ${predictionDate} with ${confidence}x confidence`);
        results.push({ location: loc.name, status: "success", prediction: { highC, lowC, condition, confidence } });
      }
    }

    return new Response(
      JSON.stringify({ success: true, date: predictionDate, results }),
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
