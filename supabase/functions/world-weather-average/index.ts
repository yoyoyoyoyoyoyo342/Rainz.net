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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { isImperial = true } = await req.json();
    
    console.log("[WORLD-WEATHER] Fetching complete weather data for", WORLD_CITIES.length, "cities");
    
    // Fetch complete weather data for all cities in parallel
    const weatherPromises = WORLD_CITIES.map(async (city) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,precipitation,pressure_msl,cloud_cover,visibility,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=${isImperial ? 'fahrenheit' : 'celsius'}&wind_speed_unit=${isImperial ? 'mph' : 'kmh'}&timezone=auto&forecast_days=10`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        
        return {
          city: city.name,
          lat: city.lat,
          lon: city.lon,
          current: {
            temperature: data.current?.temperature_2m,
            humidity: data.current?.relative_humidity_2m,
            windSpeed: data.current?.wind_speed_10m,
            windDirection: data.current?.wind_direction_10m,
            weatherCode: data.current?.weather_code,
            visibility: data.current?.visibility,
            uvIndex: data.current?.uv_index,
            feelsLike: data.current?.apparent_temperature,
            precipitation: data.current?.precipitation,
            pressure: data.current?.pressure_msl,
            cloudCover: data.current?.cloud_cover,
          },
          hourly: data.hourly,
          daily: data.daily,
        };
      } catch (e) {
        console.error(`Error fetching ${city.name}:`, e);
        return null;
      }
    });
    
    const results = await Promise.all(weatherPromises);
    const validResults = results.filter(r => r !== null && r.current?.temperature !== undefined);
    
    console.log("[WORLD-WEATHER] Got valid results from", validResults.length, "cities");
    
    if (validResults.length === 0) {
      throw new Error("Could not fetch weather data from any city");
    }
    
    // Calculate current averages
    const avgTemp = validResults.reduce((sum, r) => sum + r.current.temperature, 0) / validResults.length;
    const avgHumidity = validResults.reduce((sum, r) => sum + (r.current.humidity || 0), 0) / validResults.length;
    const avgWindSpeed = validResults.reduce((sum, r) => sum + (r.current.windSpeed || 0), 0) / validResults.length;
    const avgUvIndex = validResults.reduce((sum, r) => sum + (r.current.uvIndex || 0), 0) / validResults.length;
    const avgFeelsLike = validResults.reduce((sum, r) => sum + (r.current.feelsLike || r.current.temperature), 0) / validResults.length;
    const avgPressure = validResults.reduce((sum, r) => sum + (r.current.pressure || 1013), 0) / validResults.length;
    const avgCloudCover = validResults.reduce((sum, r) => sum + (r.current.cloudCover || 0), 0) / validResults.length;
    const avgVisibility = validResults.reduce((sum, r) => sum + (r.current.visibility || 10000), 0) / validResults.length;
    
    // Find most common weather condition
    const conditionCounts: Record<number, number> = {};
    validResults.forEach(r => {
      if (r.current.weatherCode !== undefined) {
        conditionCounts[r.current.weatherCode] = (conditionCounts[r.current.weatherCode] || 0) + 1;
      }
    });
    
    const mostCommonCode = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "0";
    
    const mostCommonCondition = weatherCodeToCondition[parseInt(mostCommonCode)] || "Mixed";
    
    // Get temperature extremes
    const temperatures = validResults.map(r => r.current.temperature);
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const coldestCity = validResults.find(r => r.current.temperature === minTemp)?.city;
    const hottestCity = validResults.find(r => r.current.temperature === maxTemp)?.city;
    
    // Calculate averaged hourly forecast (next 24 hours)
    const hourlyForecast: Array<{ time: string; temperature: number; condition: string; precipitation: number }> = [];
    const firstCityHourly = validResults[0]?.hourly;
    
    if (firstCityHourly?.time) {
      const hoursToShow = Math.min(24, firstCityHourly.time.length);
      
      for (let i = 0; i < hoursToShow; i++) {
        let tempSum = 0;
        let precipSum = 0;
        let weatherCodeCounts: Record<number, number> = {};
        let validCount = 0;
        
        validResults.forEach(city => {
          if (city.hourly?.temperature_2m?.[i] !== undefined) {
            tempSum += city.hourly.temperature_2m[i];
            precipSum += city.hourly.precipitation_probability?.[i] || 0;
            const code = city.hourly.weather_code?.[i];
            if (code !== undefined) {
              weatherCodeCounts[code] = (weatherCodeCounts[code] || 0) + 1;
            }
            validCount++;
          }
        });
        
        if (validCount > 0) {
          const mostCommonHourlyCode = Object.entries(weatherCodeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "0";
          
          hourlyForecast.push({
            time: new Date(firstCityHourly.time[i]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            temperature: Math.round(tempSum / validCount),
            condition: weatherCodeToCondition[parseInt(mostCommonHourlyCode)] || "Mixed",
            precipitation: Math.round(precipSum / validCount),
          });
        }
      }
    }
    
    // Calculate averaged daily forecast (10 days)
    const dailyForecast: Array<{ day: string; condition: string; highTemp: number; lowTemp: number; precipitation: number }> = [];
    const firstCityDaily = validResults[0]?.daily;
    
    if (firstCityDaily?.time) {
      const daysToShow = Math.min(10, firstCityDaily.time.length);
      
      for (let i = 0; i < daysToShow; i++) {
        let highSum = 0;
        let lowSum = 0;
        let precipSum = 0;
        let weatherCodeCounts: Record<number, number> = {};
        let validCount = 0;
        
        validResults.forEach(city => {
          if (city.daily?.temperature_2m_max?.[i] !== undefined) {
            highSum += city.daily.temperature_2m_max[i];
            lowSum += city.daily.temperature_2m_min?.[i] || city.daily.temperature_2m_max[i] - 10;
            precipSum += city.daily.precipitation_probability_max?.[i] || 0;
            const code = city.daily.weather_code?.[i];
            if (code !== undefined) {
              weatherCodeCounts[code] = (weatherCodeCounts[code] || 0) + 1;
            }
            validCount++;
          }
        });
        
        if (validCount > 0) {
          const mostCommonDailyCode = Object.entries(weatherCodeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "0";
          
          dailyForecast.push({
            day: new Date(firstCityDaily.time[i]).toLocaleDateString([], { weekday: "short" }),
            condition: weatherCodeToCondition[parseInt(mostCommonDailyCode)] || "Mixed",
            highTemp: Math.round(highSum / validCount),
            lowTemp: Math.round(lowSum / validCount),
            precipitation: Math.round(precipSum / validCount),
          });
        }
      }
    }
    
    const worldWeather = {
      location: "World Average",
      temperature: Math.round(avgTemp * 10) / 10,
      humidity: Math.round(avgHumidity),
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      windDirection: 0, // Not meaningful for global average
      uvIndex: Math.round(avgUvIndex * 10) / 10,
      feelsLike: Math.round(avgFeelsLike * 10) / 10,
      pressure: Math.round(avgPressure),
      cloudCover: Math.round(avgCloudCover),
      visibility: Math.round(avgVisibility / 1000), // Convert to km
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
      hourlyForecast,
      dailyForecast,
      cityData: validResults.map(r => ({
        city: r.city,
        temperature: r.current.temperature,
        humidity: r.current.humidity,
        windSpeed: r.current.windSpeed,
        weatherCode: r.current.weatherCode,
        condition: weatherCodeToCondition[r.current.weatherCode] || "Unknown",
      })),
    };
    
    console.log("[WORLD-WEATHER] Average temp:", avgTemp, "Most common:", mostCommonCondition, "Hourly forecasts:", hourlyForecast.length, "Daily forecasts:", dailyForecast.length);
    
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
