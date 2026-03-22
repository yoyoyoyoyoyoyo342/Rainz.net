import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { Hono } from "jsr:@hono/hono@^4";

const mcp = new McpServer({
  name: "rainz-weather",
  version: "1.0.0",
});

// Tool: Get current weather
mcp.tool("get_current_weather", {
  description: "Get current weather conditions for a location including temperature, humidity, wind speed, feels like, UV index, and more. Data is aggregated from multiple weather models (ECMWF, GFS, Met.no, WeatherAPI, Open-Meteo) for maximum accuracy.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude of the location (-90 to 90)" },
      longitude: { type: "number" as const, description: "Longitude of the location (-180 to 180)" },
      location_name: { type: "string" as const, description: "Human-readable name of the location (e.g. 'London, UK')" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ lat: args.latitude, lon: args.longitude, locationName: args.location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text" as const, text: `Error fetching weather: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];

    const best = sources.length > 0
      ? sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0])
      : null;

    if (!best) {
      return { content: [{ type: "text" as const, text: "No weather data available for this location." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const cw = best.currentWeather;

    const summary = [
      `📍 ${args.location_name || `${args.latitude}, ${args.longitude}`}`,
      `🌡️ Temperature: ${fToC(cw.temperature)}°C (feels like ${fToC(cw.feelsLike)}°C)`,
      `☁️ Condition: ${cw.condition}${cw.description ? ` — ${cw.description}` : ""}`,
      `💧 Humidity: ${cw.humidity}%`,
      `💨 Wind: ${cw.windSpeed} km/h`,
      `📊 Pressure: ${cw.pressure} hPa`,
      cw.uvIndex !== undefined ? `☀️ UV Index: ${cw.uvIndex}` : null,
      cw.visibility !== undefined ? `👁️ Visibility: ${cw.visibility} km` : null,
      `\nSource: ${best.source} | Sources available: ${sources.length}`,
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text" as const, text: summary }] };
  },
});

// Tool: Get hourly forecast
mcp.tool("get_hourly_forecast", {
  description: "Get an hourly weather forecast for the next 24 hours for a location. Returns temperature, condition, and precipitation probability for each hour.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude of the location" },
      longitude: { type: "number" as const, description: "Longitude of the location" },
      location_name: { type: "string" as const, description: "Human-readable name of the location" },
      hours: { type: "number" as const, description: "Number of hours to forecast (default 12, max 24)" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string; hours?: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ lat: args.latitude, lon: args.longitude, locationName: args.location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text" as const, text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];
    const best = sources[0];
    if (!best?.hourlyForecast?.length) {
      return { content: [{ type: "text" as const, text: "No hourly forecast available." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const limit = Math.min(args.hours || 12, 24);
    const lines = best.hourlyForecast.slice(0, limit).map((h: any) =>
      `${h.time} — ${fToC(h.temperature)}°C, ${h.condition}, 🌧️ ${h.precipitation}%`
    );

    return {
      content: [{ type: "text" as const, text: `⏰ Hourly Forecast for ${args.location_name || `${args.latitude}, ${args.longitude}`}\n\n${lines.join("\n")}` }],
    };
  },
});

// Tool: Get daily forecast
mcp.tool("get_daily_forecast", {
  description: "Get a 7-day daily weather forecast for a location. Returns high/low temperatures, conditions, and precipitation probability.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude of the location" },
      longitude: { type: "number" as const, description: "Longitude of the location" },
      location_name: { type: "string" as const, description: "Human-readable name of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number; location_name?: string }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ lat: args.latitude, lon: args.longitude, locationName: args.location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text" as const, text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];
    const best = sources[0];
    if (!best?.dailyForecast?.length) {
      return { content: [{ type: "text" as const, text: "No daily forecast available." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const lines = best.dailyForecast.slice(0, 7).map((d: any) =>
      `${d.day} — ${d.condition} | High: ${fToC(d.highTemp)}°C, Low: ${fToC(d.lowTemp)}°C | 🌧️ ${d.precipitation}%`
    );

    return {
      content: [{ type: "text" as const, text: `📅 7-Day Forecast for ${args.location_name || `${args.latitude}, ${args.longitude}`}\n\n${lines.join("\n")}` }],
    };
  },
});

// Tool: Get air quality
mcp.tool("get_air_quality", {
  description: "Get current air quality index (AQI) and pollen data for a location.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude of the location" },
      longitude: { type: "number" as const, description: "Longitude of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ latitude: args.latitude, longitude: args.longitude }),
    });

    if (!response.ok) {
      return { content: [{ type: "text" as const, text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    const parts: string[] = [];

    if (data.aqi) {
      parts.push(`🌬️ Air Quality Index: ${data.aqi.us_aqi} (${data.aqi.category || "N/A"})`);
      if (data.aqi.pm2_5 !== undefined) parts.push(`  PM2.5: ${data.aqi.pm2_5} μg/m³`);
      if (data.aqi.pm10 !== undefined) parts.push(`  PM10: ${data.aqi.pm10} μg/m³`);
    }

    if (data.pollen) {
      parts.push("\n🌿 Pollen Levels:");
      if (data.pollen.grass !== undefined) parts.push(`  Grass: ${data.pollen.grass}`);
      if (data.pollen.birch !== undefined) parts.push(`  Birch: ${data.pollen.birch}`);
      if (data.pollen.ragweed !== undefined) parts.push(`  Ragweed: ${data.pollen.ragweed}`);
    }

    return {
      content: [{ type: "text" as const, text: parts.length ? parts.join("\n") : "No air quality data available." }],
    };
  },
});

// Tool: Get weather alerts
mcp.tool("get_weather_alerts", {
  description: "Get active severe weather alerts for a location including storms, floods, heat warnings, etc.",
  inputSchema: {
    type: "object" as const,
    properties: {
      latitude: { type: "number" as const, description: "Latitude of the location" },
      longitude: { type: "number" as const, description: "Longitude of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ latitude: args.latitude, longitude: args.longitude }),
    });

    if (!response.ok) {
      return { content: [{ type: "text" as const, text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    if (!data.alerts?.length) {
      return { content: [{ type: "text" as const, text: "✅ No active weather alerts for this location." }] };
    }

    const lines = data.alerts.map((a: any) =>
      `⚠️ ${a.headline || a.event}\n   Severity: ${a.severity || "Unknown"}\n   ${a.description || ""}`
    );

    return { content: [{ type: "text" as const, text: `🚨 Weather Alerts:\n\n${lines.join("\n\n")}` }] };
  },
});

// HTTP transport
const transport = new StreamableHttpTransport();
const app = new Hono();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcp);
});

Deno.serve(app.fetch);
