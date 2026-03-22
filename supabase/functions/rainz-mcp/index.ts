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
  return data.sources || data || [];
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

// Tool: Get current weather
mcp.tool("get_current_weather", {
  description: "Get current weather conditions for a location. Data aggregated from ECMWF, GFS, Met.no, WeatherAPI, Open-Meteo.",
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
      const sources = await fetchAggregateWeather(args.latitude, args.longitude, args.location_name || "MCP Request");
      const best = sources.length > 0
        ? sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0])
        : null;
      if (!best) return { content: [{ type: "text" as const, text: "No weather data available." }] };
      const cw = best.currentWeather;
      const summary = [
        `📍 ${args.location_name || `${args.latitude}, ${args.longitude}`}`,
        `🌡️ Temperature: ${fToC(cw.temperature)}°C (feels like ${fToC(cw.feelsLike)}°C)`,
        `☁️ Condition: ${cw.condition}${cw.description ? ` — ${cw.description}` : ""}`,
        `💧 Humidity: ${cw.humidity}%`,
        `💨 Wind: ${cw.windSpeed} km/h`,
        `📊 Pressure: ${cw.pressure} hPa`,
        cw.uvIndex !== undefined ? `☀️ UV Index: ${cw.uvIndex}` : null,
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
  description: "Get hourly weather forecast for up to 24 hours.",
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
      const sources = await fetchAggregateWeather(args.latitude, args.longitude, args.location_name || "MCP");
      const best = sources[0];
      if (!best?.hourlyForecast?.length) return { content: [{ type: "text" as const, text: "No hourly data." }] };
      const limit = Math.min(args.hours || 12, 24);
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
  description: "Get 7-day daily weather forecast.",
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
      const sources = await fetchAggregateWeather(args.latitude, args.longitude, args.location_name || "MCP");
      const best = sources[0];
      if (!best?.dailyForecast?.length) return { content: [{ type: "text" as const, text: "No daily data." }] };
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
        parts.push(`🌬️ AQI: ${data.aqi.us_aqi} (${data.aqi.category || "N/A"})`);
        if (data.aqi.pm2_5 !== undefined) parts.push(`  PM2.5: ${data.aqi.pm2_5} μg/m³`);
      }
      if (data.pollen) {
        parts.push("\n🌿 Pollen:");
        for (const [k, v] of Object.entries(data.pollen)) parts.push(`  ${k}: ${v}`);
      }
      return { content: [{ type: "text" as const, text: parts.length ? parts.join("\n") : "No AQI data." }] };
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
      if (!data.alerts?.length) return { content: [{ type: "text" as const, text: "✅ No active alerts." }] };
      const lines = data.alerts.map((a: any) => `⚠️ ${a.headline || a.event} — ${a.severity || "Unknown"}`);
      return { content: [{ type: "text" as const, text: `🚨 Alerts:\n\n${lines.join("\n")}` }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
});

// Bind transport to server — this is the key step
const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

// Two-app pattern for Supabase Edge Functions
const app = new Hono();
const mcpApp = new Hono();

mcpApp.get("/", (c) => {
  return c.json({
    name: "Rainz Weather MCP",
    description: "AI-powered weather data from multiple models",
    tools: ["get_current_weather", "get_hourly_forecast", "get_daily_forecast", "get_air_quality", "get_weather_alerts"],
    endpoint: "/mcp",
  });
});

mcpApp.all("/mcp", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

// Also handle direct requests (for clients that hit the root)
mcpApp.all("/", async (c) => {
  if (c.req.method === "POST") {
    const response = await httpHandler(c.req.raw);
    return response;
  }
  return c.json({ name: "Rainz Weather MCP", endpoint: "/mcp" });
});

app.route("/rainz-mcp", mcpApp);

Deno.serve(app.fetch);
