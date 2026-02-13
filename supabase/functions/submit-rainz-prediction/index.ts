import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAINZ_BOT_USER_ID = "00000000-0000-0000-0000-000000000001";
// Default location: Oslo, Norway
const DEFAULT_LAT = 59.91;
const DEFAULT_LON = 10.75;
const DEFAULT_LOCATION = "Oslo";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const predictionDate = tomorrow.toISOString().split("T")[0];

    // Check if bot already predicted for tomorrow
    const { data: existing } = await supabase
      .from("weather_predictions")
      .select("id")
      .eq("user_id", RAINZ_BOT_USER_ID)
      .eq("prediction_date", predictionDate)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: "Already predicted for tomorrow" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch weather forecast from Open-Meteo for tomorrow
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=2`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();

    const dailyData = forecastData?.daily;
    if (!dailyData || dailyData.temperature_2m_max.length < 2) {
      throw new Error("Could not fetch forecast data");
    }

    // Tomorrow's index is 1
    const highC = Math.round(dailyData.temperature_2m_max[1]);
    const lowC = Math.round(dailyData.temperature_2m_min[1]);
    const weatherCode = dailyData.weathercode[1];

    // Map WMO weather code to condition
    const mapWeatherCode = (code: number): string => {
      if (code <= 1) return "sunny";
      if (code === 2) return "partly-cloudy";
      if (code === 3) return "cloudy";
      if (code >= 45 && code <= 48) return "foggy";
      if (code >= 51 && code <= 55) return "drizzle";
      if (code >= 56 && code <= 57) return "drizzle";
      if (code >= 61 && code <= 63) return "rainy";
      if (code >= 65 && code <= 67) return "heavy-rain";
      if (code >= 71 && code <= 75) return "snowy";
      if (code === 77) return "snowy";
      if (code >= 80 && code <= 82) return "rainy";
      if (code >= 85 && code <= 86) return "heavy-snow";
      if (code >= 95) return "thunderstorm";
      return "cloudy";
    };

    const condition = mapWeatherCode(weatherCode);

    // Submit prediction
    const { error } = await supabase.from("weather_predictions").insert({
      user_id: RAINZ_BOT_USER_ID,
      prediction_date: predictionDate,
      predicted_high: highC,
      predicted_low: lowC,
      predicted_condition: condition,
      location_name: DEFAULT_LOCATION,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, prediction: { highC, lowC, condition, date: predictionDate } }),
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
