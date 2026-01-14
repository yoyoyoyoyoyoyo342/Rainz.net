import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Major cities across different continents to get a global average
const WORLD_CITIES = [
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin", lat: 52.52, lon: 13.405 },
  { name: "Moscow", lat: 55.7558, lon: 37.6173 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Seoul", lat: 37.5665, lon: 126.978 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
  { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { isImperial = true } = await req.json();
    
    console.log("[WORLD-WEATHER] Fetching weather for", WORLD_CITIES.length, "cities");
    
    // Fetch weather for all cities in parallel
    const weatherPromises = WORLD_CITIES.map(async (city) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility,uv_index&temperature_unit=${isImperial ? 'fahrenheit' : 'celsius'}&wind_speed_unit=${isImperial ? 'mph' : 'kmh'}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return {
          city: city.name,
          temperature: data.current?.temperature_2m,
          humidity: data.current?.relative_humidity_2m,
          windSpeed: data.current?.wind_speed_10m,
          weatherCode: data.current?.weather_code,
          visibility: data.current?.visibility,
          uvIndex: data.current?.uv_index,
        };
      } catch (e) {
        console.error(`Error fetching ${city.name}:`, e);
        return null;
      }
    });
    
    const results = await Promise.all(weatherPromises);
    const validResults = results.filter(r => r !== null && r.temperature !== undefined);
    
    console.log("[WORLD-WEATHER] Got valid results from", validResults.length, "cities");
    
    if (validResults.length === 0) {
      throw new Error("Could not fetch weather data from any city");
    }
    
    // Calculate averages
    const avgTemp = validResults.reduce((sum, r) => sum + r.temperature, 0) / validResults.length;
    const avgHumidity = validResults.reduce((sum, r) => sum + (r.humidity || 0), 0) / validResults.length;
    const avgWindSpeed = validResults.reduce((sum, r) => sum + (r.windSpeed || 0), 0) / validResults.length;
    const avgUvIndex = validResults.reduce((sum, r) => sum + (r.uvIndex || 0), 0) / validResults.length;
    
    // Find most common weather condition
    const conditionCounts: Record<number, number> = {};
    validResults.forEach(r => {
      if (r.weatherCode !== undefined) {
        conditionCounts[r.weatherCode] = (conditionCounts[r.weatherCode] || 0) + 1;
      }
    });
    
    const mostCommonCode = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "0";
    
    // Map weather code to condition
    const weatherCodeToCondition: Record<number, string> = {
      0: "Clear",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy",
      51: "Light Drizzle",
      53: "Drizzle",
      55: "Heavy Drizzle",
      61: "Light Rain",
      63: "Rain",
      65: "Heavy Rain",
      71: "Light Snow",
      73: "Snow",
      75: "Heavy Snow",
      77: "Snow Grains",
      80: "Light Showers",
      81: "Showers",
      82: "Heavy Showers",
      85: "Light Snow Showers",
      86: "Snow Showers",
      95: "Thunderstorm",
      96: "Thunderstorm",
      99: "Severe Thunderstorm",
    };
    
    const mostCommonCondition = weatherCodeToCondition[parseInt(mostCommonCode)] || "Mixed";
    
    // Get temperature extremes
    const temperatures = validResults.map(r => r.temperature);
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const coldestCity = validResults.find(r => r.temperature === minTemp)?.city;
    const hottestCity = validResults.find(r => r.temperature === maxTemp)?.city;
    
    const worldWeather = {
      location: "World Average",
      temperature: Math.round(avgTemp * 10) / 10,
      humidity: Math.round(avgHumidity),
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      uvIndex: Math.round(avgUvIndex * 10) / 10,
      condition: mostCommonCondition,
      weatherCode: parseInt(mostCommonCode),
      citiesPolled: validResults.length,
      extremes: {
        coldest: { city: coldestCity, temperature: Math.round(minTemp * 10) / 10 },
        hottest: { city: hottestCity, temperature: Math.round(maxTemp * 10) / 10 },
      },
      conditionBreakdown: Object.entries(conditionCounts).map(([code, count]) => ({
        condition: weatherCodeToCondition[parseInt(code)] || "Unknown",
        count,
        percentage: Math.round((count / validResults.length) * 100),
      })).sort((a, b) => b.count - a.count),
      cityData: validResults,
    };
    
    console.log("[WORLD-WEATHER] Average temp:", avgTemp, "Most common:", mostCommonCondition);
    
    return new Response(JSON.stringify(worldWeather), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WORLD-WEATHER] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
