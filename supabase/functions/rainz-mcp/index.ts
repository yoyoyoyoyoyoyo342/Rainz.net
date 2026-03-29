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
  
  // Prepare sources for LLM (strip unnecessary fields)
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
  if (!response.ok) throw new Error(`Hyperlocal fetch failed: ${response.status}`);
  return await response.json();
}

// Helper to get AI-enhanced weather data
async function getAIWeather(lat: number, lon: number, locationName: string) {
  const sources = await fetchAggregateWeather(lat, lon, locationName);
  if (!sources || sources.length === 0) throw new Error("No weather sources available");
  
  // Try to get AI-enhanced data, fall back to raw
  try {
    const llm = await fetchLLMForecast(sources, locationName);
    return { llm, sources, aiEnhanced: !llm.rawApiData };
  } catch (e) {
    console.error("LLM forecast failed, using raw data:", e);
    // Fall back to best raw source
    const best = sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0]);
    return { llm: null, sources, best, aiEnhanced: false };
  }
}

// Tool: Get current weather
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
      
      // Fallback to raw data
      const best = sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0]);
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

// Tool: Get hourly forecast
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
      
      if (llm?.hourly?.length) {
        const lines = llm.hourly.slice(0, limit).map((h: any) =>
          `${h.time} — ${fToC(h.temperature)}°C, ${h.condition}, 🌧️ ${h.precipitation}% (${h.confidence}% confidence)`
        );
        return { content: [{ type: "text" as const, text: `⏰ AI-Enhanced Hourly Forecast for ${locName}\n\n${lines.join("\n")}` }] };
      }
      
      // Fallback
      const best = sources[0];
      if (!best?.hourlyForecast?.length) return { content: [{ type: "text" as const, text: "No hourly data available." }] };
      const lines = best.hourlyForecast.slice(0, limit).map((h: any) =>
        `${h.time} — ${fToC(h.temperature)}°C, ${h.condition}, 🌧️ ${h.precipitation}%`
      );
      return { content: [{ type: "text" as const, text: `⏰ Hourly Forecast\n\n${lines.join("\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get daily forecast
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
      
      // Fallback
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

// Tool: Get air quality
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
      const data = await fetchHyperlocal(args.latitude, args.longitude);
      const parts: string[] = [];
      if (data.aqi) {
        parts.push(`🌬️ AQI: ${data.aqi.value ?? data.aqi.us_aqi ?? "N/A"} (${data.aqi.category || "N/A"})`);
        if (data.aqi.pm25 !== undefined) parts.push(`  PM2.5: ${data.aqi.pm25} μg/m³`);
        if (data.aqi.pm10 !== undefined) parts.push(`  PM10: ${data.aqi.pm10} μg/m³`);
        if (data.aqi.o3 !== undefined) parts.push(`  O₃: ${data.aqi.o3} μg/m³`);
        if (data.aqi.no2 !== undefined) parts.push(`  NO₂: ${data.aqi.no2} μg/m³`);
      }
      if (data.pollen) {
        parts.push("\n🌿 Pollen:");
        for (const [k, v] of Object.entries(data.pollen)) parts.push(`  ${k}: ${v}`);
      }
      return { content: [{ type: "text" as const, text: parts.length ? parts.join("\n") : "No AQI data available for this location." }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Tool: Get weather alerts
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
      const data = await fetchHyperlocal(args.latitude, args.longitude);
      if (!data.alerts?.length) return { content: [{ type: "text" as const, text: "✅ No active weather alerts for this location." }] };
      const lines = data.alerts.map((a: any) => `⚠️ ${a.headline || a.event} — Severity: ${a.severity || "Unknown"}${a.description ? `\n   ${a.description.slice(0, 200)}` : ""}`);
      return { content: [{ type: "text" as const, text: `🚨 Active Weather Alerts:\n\n${lines.join("\n\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

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
