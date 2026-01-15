import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "npm:zod@3.22.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const RequestSchema = z.object({
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lon: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  locationName: z.string().max(200).optional(),
});

interface WeatherSource {
  source: string;
  location: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  stationInfo?: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  currentWeather: {
    temperature: number;
    condition: string;
    description: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    visibility: number;
    feelsLike: number;
    uvIndex: number;
    pressure: number;
    sunrise?: string;
    sunset?: string;
    daylight?: string;
    aqi?: number;
    aqiCategory?: string;
  };
  hourlyForecast: Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitation: number;
    icon?: string;
  }>;
  dailyForecast: Array<{
    day: string;
    condition: string;
    description: string;
    highTemp: number;
    lowTemp: number;
    precipitation: number;
    icon?: string;
  }>;
}

// Utility to parse 12h time like "07:15 AM" into minutes since midnight
function parse12hToMinutes(t: string): number | null {
  try {
    const [time, ap] = t.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (ap.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ap.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  } catch {
    return null;
  }
}

function minutesToDuration(startMin: number, endMin: number): string | undefined {
  if (startMin == null || endMin == null) return undefined;
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input parameters",
          details: validationResult.error.errors[0].message 
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        }
      );
    }

    const { lat, lon, locationName } = validationResult.data;

    const weatherApiKey =
      Deno.env.get("WEATHERAPI_KEY") ||
      Deno.env.get("WEATHER_API_KEY") ||
      Deno.env.get("WEATHER_API") ||
      Deno.env.get("Weather Api"); // try multiple names

    const sources: WeatherSource[] = [];

    // Fetch user-submitted weather reports as a community data source
    // Reports are only valid for the first hour after submission and for the same location (within ~10km)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        // Fetch recent weather reports within ~0.1 degrees (~10km) of the requested location
        const { data: reports, error } = await supabase
          .from('weather_reports')
          .select('*')
          .gte('created_at', oneHourAgo)
          .gte('latitude', lat - 0.1)
          .lte('latitude', lat + 0.1)
          .gte('longitude', lon - 0.1)
          .lte('longitude', lon + 0.1)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (!error && reports && reports.length >= 2) {
          // Only add as a source if we have at least 2 reports for consensus
          console.log(`Found ${reports.length} community weather reports for this location`);
          
          // Calculate consensus condition from reports
          const conditionCounts: Record<string, number> = {};
          reports.forEach((r: any) => {
            const cond = r.actual_condition || r.reported_condition;
            if (cond) {
              conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
            }
          });
          
          const mostReportedCondition = Object.entries(conditionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
          
          // Accuracy based on number of reports (more reports = higher confidence)
          // 2 reports = 0.70, 3 reports = 0.78, 4+ reports = 0.85
          const reportAccuracy = Math.min(0.85, 0.62 + (reports.length * 0.08));
          
          // Get average accuracy rating from reports
          const accuracyRatings = reports.map((r: any) => {
            if (r.accuracy === 'very_accurate') return 1.0;
            if (r.accuracy === 'accurate') return 0.8;
            if (r.accuracy === 'somewhat_accurate') return 0.6;
            if (r.accuracy === 'inaccurate') return 0.3;
            return 0.5;
          });
          const avgUserAccuracy = accuracyRatings.reduce((a: number, b: number) => a + b, 0) / accuracyRatings.length;
          
          const communitySource: WeatherSource = {
            source: `Community Reports (${reports.length})`,
            location: locationName || reports[0]?.location_name || "Selected Location",
            latitude: lat,
            longitude: lon,
            accuracy: reportAccuracy * avgUserAccuracy,
            currentWeather: {
              temperature: 0, // We don't have temperature from reports
              condition: mostReportedCondition,
              description: `Based on ${reports.length} user reports in the last hour`,
              humidity: 0,
              windSpeed: 0,
              windDirection: 0,
              visibility: 0,
              feelsLike: 0,
              uvIndex: 0,
              pressure: 0,
            },
            hourlyForecast: [],
            dailyForecast: [],
          };
          
          sources.push(communitySource);
          console.log(`Added community source with condition: ${mostReportedCondition}, accuracy: ${(reportAccuracy * avgUserAccuracy).toFixed(2)}`);
        } else if (reports && reports.length === 1) {
          console.log("Only 1 community report found - not enough for consensus, skipping community source");
        }
      } catch (err) {
        console.error("Error fetching community weather reports:", err);
      }
    }

    // Fetch from multiple Open-Meteo models for ensemble averaging
    const openMeteoModels = [
      { name: "ECMWF", model: "ecmwf_ifs04", accuracy: 0.95 },
      { name: "GFS", model: "gfs_seamless", accuracy: 0.90 },
      { name: "DWD ICON", model: "icon_seamless", accuracy: 0.92 },
      { name: "UKMO", model: "ukmo_seamless", accuracy: 0.93 },
      { name: "METEOFRANCE", model: "meteofrance_seamless", accuracy: 0.91 },
      { name: "JMA", model: "jma_seamless", accuracy: 0.89 },
      { name: "GEM", model: "gem_seamless", accuracy: 0.88 },
    ];

    for (const modelConfig of openMeteoModels) {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", lat.toString());
        url.searchParams.set("longitude", lon.toString());
        url.searchParams.set("current_weather", "true");
        url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weathercode,relative_humidity_2m,apparent_temperature,visibility,pressure_msl,uv_index,wind_speed_10m,wind_direction_10m");
        url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset");
        url.searchParams.set("temperature_unit", "fahrenheit");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "10");
        url.searchParams.set("models", modelConfig.model);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Open-Meteo ${modelConfig.name} HTTP ${res.status}`);
        const data = await res.json();

        const current = data.current_weather;
        const hourly = data.hourly;
        const daily = data.daily;

        const conditionMap: Record<number, string> = {
          0: "Clear", 1: "Partly Cloudy", 2: "Partly Cloudy", 3: "Overcast",
          45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
          61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
          80: "Light Showers", 81: "Showers", 82: "Heavy Showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Heavy Thunderstorm"
        };

        const getCondition = (code: number) => conditionMap[code] || "Unknown";

        const source: WeatherSource = {
          source: modelConfig.name,
          location: locationName || "Selected Location",
          latitude: lat,
          longitude: lon,
          accuracy: modelConfig.accuracy,
          currentWeather: {
            temperature: Math.round(current.temperature ?? 0),
            condition: getCondition(current.weathercode ?? 0),
            description: getCondition(current.weathercode ?? 0),
            humidity: Math.round(hourly.relative_humidity_2m?.[0] ?? 0),
            windSpeed: Math.round(current.windspeed ?? 0),
            windDirection: Math.round(current.winddirection ?? 0),
            visibility: Math.round((hourly.visibility?.[0] ?? 10000) / 1609.34),
            feelsLike: Math.round(hourly.apparent_temperature?.[0] ?? current.temperature ?? 0),
            uvIndex: Math.round(hourly.uv_index?.[0] ?? 0),
            pressure: Math.round(hourly.pressure_msl?.[0] ?? 1013),
            sunrise: daily.sunrise?.[0],
            sunset: daily.sunset?.[0],
          },
          hourlyForecast: hourly.time.slice(0, 24).map((time: string, i: number) => ({
            time: new Date(time).toLocaleTimeString([], { hour: "2-digit" }),
            temperature: Math.round(hourly.temperature_2m?.[i] ?? 0),
            condition: getCondition(hourly.weathercode?.[i] ?? 0),
            precipitation: Math.round(hourly.precipitation_probability?.[i] ?? 0),
            icon: "",
          })),
          dailyForecast: daily.time.slice(0, 10).map((time: string, i: number) => ({
            day: new Date(time).toLocaleDateString([], { weekday: "short" }),
            condition: getCondition(daily.weathercode?.[i] ?? 0),
            description: getCondition(daily.weathercode?.[i] ?? 0),
            highTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
            lowTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
            precipitation: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
            icon: "",
          })),
        };

        sources.push(source);
        console.log(`Successfully fetched ${modelConfig.name} model data`);
      } catch (err) {
        console.error(`${modelConfig.name} model fetch failed:`, err);
      }
    }

    // WeatherAPI.com (keep as additional source)
    if (weatherApiKey) {
      try {
        const url = new URL("https://api.weatherapi.com/v1/forecast.json");
        url.searchParams.set("key", weatherApiKey);
        url.searchParams.set("q", `${lat},${lon}`);
        url.searchParams.set("days", "10");
        url.searchParams.set("aqi", "yes");
        url.searchParams.set("alerts", "no");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`WeatherAPI HTTP ${res.status}`);
        const data = await res.json();

        const astro = data?.forecast?.forecastday?.[0]?.astro;
        const sunrise = astro?.sunrise as string | undefined;
        const sunset = astro?.sunset as string | undefined;
        const daylight = sunrise && sunset
          ? minutesToDuration(parse12hToMinutes(sunrise)!, parse12hToMinutes(sunset)!)
          : undefined;

        const current = data?.current;
        const hrs = data?.forecast?.forecastday?.[0]?.hour || [];
        const days = data?.forecast?.forecastday || [];

        const source: WeatherSource = {
          source: "WeatherAPI",
          location: locationName || data?.location?.name || "Selected Location",
          latitude: lat,
          longitude: lon,
          accuracy: 0.88,
          stationInfo: {
            name: data?.location?.name || "Unknown Station",
            region: data?.location?.region || "",
            country: data?.location?.country || "",
            localtime: data?.location?.localtime || "",
          },
          currentWeather: {
            temperature: Math.round(current?.temp_f ?? 0),
            condition: current?.condition?.text ?? "Unknown",
            description: current?.condition?.text ?? "Unknown",
            humidity: Math.round(current?.humidity ?? 0),
            windSpeed: Math.round(current?.wind_mph ?? 0),
            windDirection: Math.round(current?.wind_degree ?? 0),
            visibility: Math.round(current?.vis_miles ?? 0),
            feelsLike: Math.round(current?.feelslike_f ?? 0),
            uvIndex: Math.round(current?.uv ?? 0),
            pressure: Math.round(current?.pressure_mb ?? 0),
            sunrise,
            sunset,
            daylight,
            aqi: typeof current?.air_quality?.["us-epa-index"] === "number" ? current.air_quality["us-epa-index"] : undefined,
            aqiCategory: undefined,
          },
          hourlyForecast: hrs.slice(0, 24).map((h: any) => ({
            time: new Date(h?.time ?? Date.now()).toLocaleTimeString([], { hour: "2-digit" }),
            temperature: Math.round(h?.temp_f ?? 0),
            condition: h?.condition?.text ?? "Unknown",
            precipitation: Math.round(h?.chance_of_rain ?? 0),
            icon: "",
          })),
          dailyForecast: days.slice(0, 10).map((d: any) => ({
            day: new Date(d?.date ?? Date.now()).toLocaleDateString([], { weekday: "short" }),
            condition: d?.day?.condition?.text ?? "Unknown",
            description: d?.day?.condition?.text ?? "Unknown",
            highTemp: Math.round(d?.day?.maxtemp_f ?? 0),
            lowTemp: Math.round(d?.day?.mintemp_f ?? 0),
            precipitation: Math.round(d?.day?.daily_chance_of_rain ?? 0),
            icon: "",
          })),
        };

        sources.push(source);
        console.log("Successfully fetched WeatherAPI data");
      } catch (err) {
        console.error("WeatherAPI fetch failed", err);
      }
    } else {
      console.warn("WEATHERAPI key missing; skipping WeatherAPI provider");
    }

    // Met.no (Norwegian Meteorological Institute) - completely free, no key needed
    try {
      const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lon", lon.toString());

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Rainz Weather App (contact@rainz.app)",
        },
      });
      if (!res.ok) throw new Error(`Met.no HTTP ${res.status}`);
      const data = await res.json();

      const current = data?.properties?.timeseries?.[0];
      const hourlyData = data?.properties?.timeseries || [];
      
      // Met.no uses symbol codes for conditions
      const symbolToCondition = (code: string) => {
        if (!code) return "Unknown";
        if (code.includes("clearsky")) return "Clear";
        if (code.includes("fair")) return "Partly Cloudy";
        if (code.includes("cloudy")) return "Cloudy";
        if (code.includes("rain")) return "Rain";
        if (code.includes("snow")) return "Snow";
        if (code.includes("thunder")) return "Thunderstorm";
        if (code.includes("fog")) return "Foggy";
        return "Partly Cloudy";
      };

      const source: WeatherSource = {
        source: "Met.no",
        location: locationName || "Selected Location",
        latitude: lat,
        longitude: lon,
        accuracy: 0.94,
        currentWeather: {
          temperature: Math.round((current?.data?.instant?.details?.air_temperature ?? 0) * 9/5 + 32),
          condition: symbolToCondition(current?.data?.next_1_hours?.summary?.symbol_code),
          description: symbolToCondition(current?.data?.next_1_hours?.summary?.symbol_code),
          humidity: Math.round(current?.data?.instant?.details?.relative_humidity ?? 0),
          windSpeed: Math.round((current?.data?.instant?.details?.wind_speed ?? 0) * 2.237),
          windDirection: Math.round(current?.data?.instant?.details?.wind_from_direction ?? 0),
          visibility: 10,
          feelsLike: Math.round((current?.data?.instant?.details?.air_temperature ?? 0) * 9/5 + 32),
          uvIndex: 0,
          pressure: Math.round(current?.data?.instant?.details?.air_pressure_at_sea_level ?? 1013),
        },
        hourlyForecast: hourlyData.slice(0, 24).map((h: any) => ({
          time: new Date(h?.time ?? Date.now()).toLocaleTimeString([], { hour: "2-digit" }),
          temperature: Math.round((h?.data?.instant?.details?.air_temperature ?? 0) * 9/5 + 32),
          condition: symbolToCondition(h?.data?.next_1_hours?.summary?.symbol_code),
          precipitation: Math.round((h?.data?.next_1_hours?.details?.precipitation_amount ?? 0) * 0.0393701),
          icon: "",
        })),
        dailyForecast: [],
      };

      sources.push(source);
      console.log("Successfully fetched Met.no data");
    } catch (err) {
      console.error("Met.no fetch failed:", err);
    }

    // Bright Sky (German Weather Service DWD) - completely free, no key needed
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const url = new URL("https://api.brightsky.dev/weather");
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lon", lon.toString());
      url.searchParams.set("date", dateStr);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`BrightSky HTTP ${res.status}`);
      const data = await res.json();

      const weather = data?.weather || [];
      const current = weather[0];
      
      const conditionMap: Record<string, string> = {
        "clear-day": "Clear", "clear-night": "Clear",
        "partly-cloudy-day": "Partly Cloudy", "partly-cloudy-night": "Partly Cloudy",
        "cloudy": "Cloudy", "fog": "Foggy",
        "wind": "Windy", "rain": "Rain", "sleet": "Sleet",
        "snow": "Snow", "hail": "Hail", "thunderstorm": "Thunderstorm"
      };

      if (current) {
        const source: WeatherSource = {
          source: "BrightSky DWD",
          location: locationName || "Selected Location",
          latitude: lat,
          longitude: lon,
          accuracy: 0.91,
          currentWeather: {
            temperature: Math.round((current?.temperature ?? 0) * 9/5 + 32),
            condition: conditionMap[current?.icon] || "Unknown",
            description: conditionMap[current?.icon] || "Unknown",
            humidity: Math.round(current?.relative_humidity ?? 0),
            windSpeed: Math.round((current?.wind_speed ?? 0) * 0.621371),
            windDirection: Math.round(current?.wind_direction ?? 0),
            visibility: Math.round((current?.visibility ?? 10000) / 1609.34),
            feelsLike: Math.round((current?.temperature ?? 0) * 9/5 + 32),
            uvIndex: 0,
            pressure: Math.round(current?.pressure_msl ?? 1013),
          },
          hourlyForecast: weather.slice(0, 24).map((h: any) => ({
            time: new Date(h?.timestamp ?? Date.now()).toLocaleTimeString([], { hour: "2-digit" }),
            temperature: Math.round((h?.temperature ?? 0) * 9/5 + 32),
            condition: conditionMap[h?.icon] || "Unknown",
            precipitation: Math.round(h?.precipitation ?? 0),
            icon: "",
          })),
          dailyForecast: [],
        };
        sources.push(source);
        console.log("Successfully fetched BrightSky DWD data");
      }
    } catch (err) {
      console.error("BrightSky fetch failed:", err);
    }

    // Open-Meteo Marine API for coastal areas - free, no key needed
    try {
      const url = new URL("https://marine-api.open-meteo.com/v1/marine");
      url.searchParams.set("latitude", lat.toString());
      url.searchParams.set("longitude", lon.toString());
      url.searchParams.set("hourly", "wave_height,wave_direction,wave_period,swell_wave_height");
      url.searchParams.set("timezone", "auto");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        // Only add if we have valid marine data (coastal location)
        if (data?.hourly?.wave_height?.[0] !== undefined) {
          console.log("Marine data available for coastal location");
        }
      }
    } catch (err) {
      // Marine data is optional, no need to log errors
    }

    // SMHI (Swedish Meteorological and Hydrological Institute) - free, no key needed
    try {
      const url = new URL(`https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon.toFixed(4)}/lat/${lat.toFixed(4)}/data.json`);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`SMHI HTTP ${res.status}`);
      const data = await res.json();

      const timeSeries = data?.timeSeries || [];
      const current = timeSeries[0];
      
      const getParam = (params: any[], name: string) => {
        const param = params?.find((p: any) => p.name === name);
        return param?.values?.[0];
      };

      const wsymb2ToCondition = (code: number) => {
        const conditions: Record<number, string> = {
          1: "Clear", 2: "Partly Cloudy", 3: "Partly Cloudy", 4: "Partly Cloudy",
          5: "Cloudy", 6: "Cloudy", 7: "Foggy", 8: "Rain", 9: "Rain", 10: "Rain",
          11: "Thunderstorm", 12: "Sleet", 13: "Sleet", 14: "Sleet",
          15: "Snow", 16: "Snow", 17: "Snow", 18: "Rain", 19: "Rain", 20: "Rain",
          21: "Thunderstorm", 22: "Sleet", 23: "Sleet", 24: "Sleet",
          25: "Snow", 26: "Snow", 27: "Snow"
        };
        return conditions[code] || "Unknown";
      };

      if (current) {
        const params = current?.parameters || [];
        const source: WeatherSource = {
          source: "SMHI",
          location: locationName || "Selected Location",
          latitude: lat,
          longitude: lon,
          accuracy: 0.90,
          currentWeather: {
            temperature: Math.round((getParam(params, 't') ?? 0) * 9/5 + 32),
            condition: wsymb2ToCondition(getParam(params, 'Wsymb2') ?? 1),
            description: wsymb2ToCondition(getParam(params, 'Wsymb2') ?? 1),
            humidity: Math.round(getParam(params, 'r') ?? 0),
            windSpeed: Math.round((getParam(params, 'ws') ?? 0) * 2.237),
            windDirection: Math.round(getParam(params, 'wd') ?? 0),
            visibility: Math.round((getParam(params, 'vis') ?? 10) / 1.609),
            feelsLike: Math.round((getParam(params, 't') ?? 0) * 9/5 + 32),
            uvIndex: 0,
            pressure: Math.round(getParam(params, 'msl') ?? 1013),
          },
          hourlyForecast: timeSeries.slice(0, 24).map((h: any) => {
            const hParams = h?.parameters || [];
            return {
              time: new Date(h?.validTime ?? Date.now()).toLocaleTimeString([], { hour: "2-digit" }),
              temperature: Math.round((getParam(hParams, 't') ?? 0) * 9/5 + 32),
              condition: wsymb2ToCondition(getParam(hParams, 'Wsymb2') ?? 1),
              precipitation: Math.round((getParam(hParams, 'pmean') ?? 0) * 100),
              icon: "",
            };
          }),
          dailyForecast: [],
        };
        sources.push(source);
        console.log("Successfully fetched SMHI data");
      }
    } catch (err) {
      console.error("SMHI fetch failed:", err);
    }

    // 7Timer! - Completely free, no key needed
    try {
      const url = `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`7Timer HTTP ${res.status}`);
      const data = await res.json();

      const datapoints = data?.dataseries || [];
      const current = datapoints[0];
      
      const prec7TimerToCondition = (prec: string, cloudcover: number) => {
        if (prec === "snow") return "Snow";
        if (prec === "rain" || prec === "showers" || prec === "ishowers") return "Rain";
        if (prec === "ts" || prec === "tsrain") return "Thunderstorm";
        if (cloudcover <= 2) return "Clear";
        if (cloudcover <= 5) return "Partly Cloudy";
        return "Cloudy";
      };

      if (current) {
        const source: WeatherSource = {
          source: "7Timer!",
          location: locationName || "Selected Location",
          latitude: lat,
          longitude: lon,
          accuracy: 0.82,
          currentWeather: {
            temperature: Math.round(current?.temp2m * 9/5 + 32),
            condition: prec7TimerToCondition(current?.prec_type, current?.cloudcover),
            description: prec7TimerToCondition(current?.prec_type, current?.cloudcover),
            humidity: Math.round(current?.rh2m ? (current.rh2m.replace('%', '').split('-').reduce((a: number, b: string) => a + parseInt(b), 0) / 2) : 50),
            windSpeed: Math.round(current?.wind10m?.speed * 2.237 || 0),
            windDirection: 0,
            visibility: 10,
            feelsLike: Math.round(current?.temp2m * 9/5 + 32),
            uvIndex: 0,
            pressure: 1013,
          },
          hourlyForecast: datapoints.slice(0, 8).map((h: any, i: number) => ({
            time: new Date(Date.now() + i * 3 * 60 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit" }),
            temperature: Math.round(h?.temp2m * 9/5 + 32),
            condition: prec7TimerToCondition(h?.prec_type, h?.cloudcover),
            precipitation: h?.prec_type === "none" ? 0 : 50,
            icon: "",
          })),
          dailyForecast: [],
        };
        sources.push(source);
        console.log("Successfully fetched 7Timer data");
      }
    } catch (err) {
      console.error("7Timer fetch failed:", err);
    }

    return new Response(JSON.stringify({ sources }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    console.error("aggregate-weather error", e);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable. Please try again." }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
