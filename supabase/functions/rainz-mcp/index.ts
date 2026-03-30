import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { Hono } from "jsr:@hono/hono@^4";

const mcp = new McpServer({
  name: "rainz-weather",
  version: "1.0.0",
});

const fToC = (f: number) => Math.round((f - 32) * 5 / 9);

async function fetchAggregateWeather(lat: number, lon: number, locationName: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ lat, lon, locationName }),
  });
  if (!response.ok) throw new Error(`Weather fetch failed: ${response.status}`);
  const data = await response.json();
  return data.sources || [];
}

async function fetchLLMForecast(sources: any[], location: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  const cleanSources = sources.map(s => ({
    source: s.source,
    currentWeather: s.currentWeather,
    hourlyForecast: s.hourlyForecast?.slice(0, 12),
    dailyForecast: s.dailyForecast?.slice(0, 7),
  }));

  const response = await fetch(`${supabaseUrl}/functions/v1/llm-weather-forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ sources: cleanSources, location }),
  });
  if (!response.ok) throw new Error(`LLM forecast failed: ${response.status}`);
  return await response.json();
}

async function fetchHyperlocal(lat: number, lon: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const response = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ latitude: lat, longitude: lon }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Hyperlocal fetch failed: ${response.status}`, errorText);
    throw new Error(`Hyperlocal fetch failed: ${response.status}`);
  }
  return await response.json();
}

// Helper: find best raw source from aggregate data
function getBestSource(sources: any[]) {
  return sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0]);
}

// Helper: find any source with hourly data
function getSourceWithHourly(sources: any[]): any | null {
  // First try best accuracy source
  const best = getBestSource(sources);
  if (best?.hourlyForecast?.length) return best;
  // Then try any source
  for (const s of sources) {
    if (s?.hourlyForecast?.length) return s;
  }
  return null;
}

async function getAIWeather(lat: number, lon: number, locationName: string) {
  const sources = await fetchAggregateWeather(lat, lon, locationName);
  if (!sources || sources.length === 0) throw new Error("No weather sources available");
  
  try {
    const llm = await fetchLLMForecast(sources, locationName);
    return { llm, sources, aiEnhanced: !llm.rawApiData };
  } catch (e) {
    console.error("LLM forecast failed, using raw data:", e);
    return { llm: null, sources, aiEnhanced: false };
  }
}

// Tool: Get current weather (working — do not touch logic)
mcp.tool("get_current_weather", {
  description: "Get AI-enhanced current weather conditions for a location. Data aggregated from 13+ weather models (ECMWF, GFS, DWD ICON, UKMO, METEOFRANCE, JMA, GEM, Met.no, WeatherAPI, SMHI, 7Timer, OpenWeatherMap) and analyzed by AI for accuracy.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude (-90 to 90)" },
      longitude: { type: "number" as const, description: "Longitude (-180 to 180)" },
      location_name: { type: "string" as const, description: "Location name e.g. 'London, UK'" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string }) => {
    try {
      const locName = args.location_name || "Unknown Location";
      const { llm, sources, aiEnhanced } = await getAIWeather(args.latitude, args.longitude, locName);
      
      if (llm?.current) {
        const c = llm.current;
        const summary = [
          `📍 ${locName}`,
          `🌡️ Temperature: ${fToC(c.temperature)}°C (feels like ${fToC(c.feelsLike)}°C)`,
          `☁️ Condition: ${c.condition}${c.description ? ` — ${c.description}` : ""}`,
          `💧 Humidity: ${c.humidity}%`,
          `💨 Wind: ${Math.round(c.windSpeed * 1.60934)} km/h`,
          `📊 Pressure: ${c.pressure} hPa`,
          `🎯 AI Confidence: ${c.confidence}%`,
          llm.summary ? `\n📝 ${llm.summary}` : null,
          llm.insights?.length ? `\n💡 Insights:\n${llm.insights.map((i: string) => `  • ${i}`).join("\n")}` : null,
          `\n📊 Model Agreement: ${llm.modelAgreement}% | ${sources.length} models queried${aiEnhanced ? " | AI-enhanced" : ""}`,
        ].filter(Boolean).join("\n");
        return { content: [{ type: "text" as const, text: summary }] };
      }
      
      const best = getBestSource(sources);
      const cw = best.currentWeather;
      const summary = [
        `📍 ${locName}`,
        `🌡️ Temperature: ${fToC(cw.temperature)}°C (feels like ${fToC(cw.feelsLike)}°C)`,
        `☁️ Condition: ${cw.condition}`,
        `💧 Humidity: ${cw.humidity}%`,
        `💨 Wind: ${Math.round(cw.windSpeed * 1.60934)} km/h`,
        `📊 Pressure: ${cw.pressure} hPa`,
        `\nSource: ${best.source} | ${sources.length} models queried`,
      ].filter(Boolean).join("\n");
      return { content: [{ type: "text" as const, text: summary }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get hourly forecast — fixed to properly read from raw sources when LLM returns empty
mcp.tool("get_hourly_forecast", {
  description: "Get AI-enhanced hourly weather forecast for up to 24 hours, analyzed from 13+ weather models.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const },
      longitude: { type: "number" as const },
      location_name: { type: "string" as const },
      hours: { type: "number" as const, description: "Hours to forecast (default 12, max 24)" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string; hours?: number }) => {
    try {
      const locName = args.location_name || "Unknown Location";
      const { llm, sources } = await getAIWeather(args.latitude, args.longitude, locName);
      const limit = Math.min(args.hours || 12, 24);
      
      // Try AI-enhanced hourly data first
      if (llm?.hourly?.length) {
        console.log(`[MCP hourly] LLM returned ${llm.hourly.length} hourly entries`);
        const lines = llm.hourly.slice(0, limit).map((h: any) =>
          `${h.time} — ${fToC(h.temperature)}°C, ${h.condition}, 🌧️ ${h.precipitation}% (${h.confidence}% confidence)`
        );
        return { content: [{ type: "text" as const, text: `⏰ AI-Enhanced Hourly Forecast for ${locName}\n\n${lines.join("\n")}` }] };
      }
      
      // Fallback: find any raw source with hourly data
      console.log(`[MCP hourly] LLM hourly empty/missing, checking ${sources.length} raw sources`);
      const sourceWithHourly = getSourceWithHourly(sources);
      
      if (!sourceWithHourly) {
        console.error(`[MCP hourly] No source has hourly data. Sources: ${sources.map((s: any) => `${s.source}(hourly:${s.hourlyForecast?.length || 0})`).join(', ')}`);
        return { content: [{ type: "text" as const, text: `No hourly data available. Queried ${sources.length} models but none returned hourly forecasts.` }] };
      }
      
      console.log(`[MCP hourly] Using raw source: ${sourceWithHourly.source} with ${sourceWithHourly.hourlyForecast.length} entries`);
      const lines = sourceWithHourly.hourlyForecast.slice(0, limit).map((h: any) => {
        const temp = h.temperature !== undefined ? fToC(h.temperature) : "N/A";
        const condition = h.condition || h.weatherCondition || "Unknown";
        const precip = h.precipitation ?? h.precipitationProbability ?? "N/A";
        return `${h.time} — ${temp}°C, ${condition}, 🌧️ ${precip}%`;
      });
      return { content: [{ type: "text" as const, text: `⏰ Hourly Forecast for ${locName} (${sourceWithHourly.source})\n\n${lines.join("\n")}` }] };
    } catch (e) {
      console.error("[MCP hourly] Error:", (e as Error).message);
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get daily forecast (working — do not touch logic)
mcp.tool("get_daily_forecast", {
  description: "Get AI-enhanced 7-day daily weather forecast, analyzed from 13+ weather models.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const },
      longitude: { type: "number" as const },
      location_name: { type: "string" as const },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string }) => {
    try {
      const locName = args.location_name || "Unknown Location";
      const { llm, sources } = await getAIWeather(args.latitude, args.longitude, locName);
      
      if (llm?.daily?.length) {
        const lines = llm.daily.slice(0, 7).map((d: any) =>
          `${d.day} — ${d.condition} | High: ${fToC(d.highTemp)}°C Low: ${fToC(d.lowTemp)}°C | 🌧️ ${d.precipitation}% | ${d.confidence}% confidence${d.description ? ` — ${d.description}` : ""}`
        );
        return { content: [{ type: "text" as const, text: `📅 AI-Enhanced 7-Day Forecast for ${locName}\n\n${lines.join("\n")}` }] };
      }
      
      const best = sources[0];
      if (!best?.dailyForecast?.length) return { content: [{ type: "text" as const, text: "No daily data available." }] };
      const lines = best.dailyForecast.slice(0, 7).map((d: any) =>
        `${d.day} — ${d.condition} | High: ${fToC(d.highTemp)}°C Low: ${fToC(d.lowTemp)}°C | 🌧️ ${d.precipitation}%`
      );
      return { content: [{ type: "text" as const, text: `📅 7-Day Forecast\n\n${lines.join("\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get air quality — fixed with proper error logging and data extraction
mcp.tool("get_air_quality", {
  description: "Get air quality index (AQI) and pollen data.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const },
      longitude: { type: "number" as const },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    try {
      console.log(`[MCP aqi] Fetching for ${args.latitude},${args.longitude}`);
      const data = await fetchHyperlocal(args.latitude, args.longitude);
      console.log(`[MCP aqi] Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`[MCP aqi] AQI data: ${JSON.stringify(data.aqi)}`);
      console.log(`[MCP aqi] Pollen data: ${JSON.stringify(data.pollen)}`);
      
      const parts: string[] = [];
      
      if (data.aqi && typeof data.aqi === 'object') {
        const aqi = data.aqi;
        // The hyperlocal function returns us-epa-index as 'value'
        const aqiValue = aqi.value ?? aqi.us_aqi ?? aqi['us-epa-index'];
        const aqiCategory = aqiValue !== undefined ? getAQICategory(Number(aqiValue)) : "N/A";
        
        parts.push(`🌬️ AQI: ${aqiValue ?? "N/A"} (${aqiCategory})`);
        if (aqi.pm25 !== undefined && aqi.pm25 !== 0) parts.push(`  PM2.5: ${Number(aqi.pm25).toFixed(1)} μg/m³`);
        if (aqi.pm10 !== undefined && aqi.pm10 !== 0) parts.push(`  PM10: ${Number(aqi.pm10).toFixed(1)} μg/m³`);
        if (aqi.o3 !== undefined && aqi.o3 !== 0) parts.push(`  O₃: ${Number(aqi.o3).toFixed(1)} μg/m³`);
        if (aqi.no2 !== undefined && aqi.no2 !== 0) parts.push(`  NO₂: ${Number(aqi.no2).toFixed(1)} μg/m³`);
        if (aqi.so2 !== undefined && aqi.so2 !== 0) parts.push(`  SO₂: ${Number(aqi.so2).toFixed(1)} μg/m³`);
        if (aqi.co !== undefined && aqi.co !== 0) parts.push(`  CO: ${Number(aqi.co).toFixed(1)} μg/m³`);
      } else {
        console.error(`[MCP aqi] AQI data is missing or invalid: ${typeof data.aqi}`);
      }
      
      if (data.pollen && typeof data.pollen === 'object') {
        parts.push("\n🌿 Pollen Levels:");
        const pollen = data.pollen;
        if (pollen.grass !== undefined) parts.push(`  Grass: ${getPollenLevel(pollen.grass)} (${pollen.grass}/5)`);
        if (pollen.tree !== undefined) parts.push(`  Tree: ${getPollenLevel(pollen.tree)} (${pollen.tree}/5)`);
        if (pollen.weed !== undefined) parts.push(`  Weed: ${getPollenLevel(pollen.weed)} (${pollen.weed}/5)`);
      }
      
      if (parts.length === 0) {
        console.error(`[MCP aqi] No AQI or pollen data in response. Full data: ${JSON.stringify(data).slice(0, 500)}`);
        return { content: [{ type: "text" as const, text: "No AQI data available for this location. The air quality service may be temporarily unavailable." }] };
      }
      
      return { content: [{ type: "text" as const, text: parts.join("\n") }] };
    } catch (e) {
      console.error("[MCP aqi] Error:", (e as Error).message);
      return { content: [{ type: "text" as const, text: `Error fetching air quality: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get weather alerts — fixed with proper error logging
mcp.tool("get_weather_alerts", {
  description: "Get active severe weather alerts (storms, floods, heat warnings).",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const },
      longitude: { type: "number" as const },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    try {
      console.log(`[MCP alerts] Fetching for ${args.latitude},${args.longitude}`);
      const data = await fetchHyperlocal(args.latitude, args.longitude);
      console.log(`[MCP alerts] Alerts array length: ${data.alerts?.length ?? 'undefined'}`);
      
      if (data.error) {
        console.error(`[MCP alerts] Hyperlocal returned error: ${data.error}`);
        return { content: [{ type: "text" as const, text: `⚠️ Could not check weather alerts: ${data.error}` }] };
      }
      
      if (!data.alerts || !Array.isArray(data.alerts) || data.alerts.length === 0) {
        return { content: [{ type: "text" as const, text: "✅ No active weather alerts for this location." }] };
      }
      
      console.log(`[MCP alerts] Found ${data.alerts.length} alerts`);
      const lines = data.alerts.map((a: any) => {
        const headline = a.headline || a.event || "Weather Alert";
        const severity = a.severity || "Unknown";
        const desc = a.description ? `\n   ${a.description.slice(0, 300)}` : "";
        return `⚠️ ${headline} — Severity: ${severity}${desc}`;
      });
      return { content: [{ type: "text" as const, text: `🚨 Active Weather Alerts:\n\n${lines.join("\n\n")}` }] };
    } catch (e) {
      console.error("[MCP alerts] Error:", (e as Error).message);
      return { content: [{ type: "text" as const, text: `Error fetching weather alerts: ${(e as Error).message}` }] };
    }
  },
});

// Helper: AQI category from EPA index
function getAQICategory(value: number): string {
  if (value <= 1) return "Good";
  if (value <= 2) return "Moderate";
  if (value <= 3) return "Unhealthy for Sensitive Groups";
  if (value <= 4) return "Unhealthy";
  if (value <= 5) return "Very Unhealthy";
  return "Hazardous";
}

// Helper: pollen level description
function getPollenLevel(value: number): string {
  if (value <= 1) return "Very Low";
  if (value <= 2) return "Low";
  if (value <= 3) return "Moderate";
  if (value <= 4) return "High";
  return "Very High";
}

// Bind transport to server
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

const app = new Hono();
const mcpApp = new Hono();

mcpApp.get("/", (c) => {
  return c.json({
    name: "Rainz Weather MCP",
    description: "AI-powered weather data from 13+ models with Groq LLM analysis",
    tools: ["get_current_weather", "get_hourly_forecast", "get_daily_forecast", "get_air_quality", "get_weather_alerts"],
    endpoint: "/mcp",
  });
});

mcpApp.all("/mcp", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

mcpApp.all("/", async (c) => {
  if (c.req.method === "POST") {
    const response = await httpHandler(c.req.raw);
    return response;
  }
  return c.json({ name: "Rainz Weather MCP", endpoint: "/mcp" });
});

app.route("/rainz-mcp", mcpApp);

Deno.serve(app.fetch);
