import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";

const app = new Hono();

const mcpServer = new McpServer({
  name: "rainz-weather",
  version: "1.0.0",
});

// Tool: Get current weather
mcpServer.tool({
  name: "get_current_weather",
  description: "Get current weather conditions for a location including temperature, humidity, wind speed, feels like, UV index, and more. Data is aggregated from multiple weather models (ECMWF, GFS, Met.no, WeatherAPI, Open-Meteo) for maximum accuracy.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number", description: "Latitude of the location (-90 to 90)" },
      longitude: { type: "number", description: "Longitude of the location (-180 to 180)" },
      location_name: { type: "string", description: "Human-readable name of the location (e.g. 'London, UK')" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async ({ latitude, longitude, location_name }: { latitude: number; longitude: number; location_name?: string }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ lat: latitude, lon: longitude, locationName: location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text", text: `Error fetching weather: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];

    // Pick the most accurate source
    const best = sources.length > 0
      ? sources.reduce((a: any, b: any) => ((b.accuracy || 0) > (a.accuracy || 0) ? b : a), sources[0])
      : null;

    if (!best) {
      return { content: [{ type: "text", text: "No weather data available for this location." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const cw = best.currentWeather;

    const summary = [
      `📍 ${location_name || `${latitude}, ${longitude}`}`,
      `🌡️ Temperature: ${fToC(cw.temperature)}°C (feels like ${fToC(cw.feelsLike)}°C)`,
      `☁️ Condition: ${cw.condition}${cw.description ? ` — ${cw.description}` : ""}`,
      `💧 Humidity: ${cw.humidity}%`,
      `💨 Wind: ${cw.windSpeed} km/h`,
      `📊 Pressure: ${cw.pressure} hPa`,
      cw.uvIndex !== undefined ? `☀️ UV Index: ${cw.uvIndex}` : null,
      cw.visibility !== undefined ? `👁️ Visibility: ${cw.visibility} km` : null,
      `\nSource: ${best.source} | Sources available: ${sources.length}`,
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text", text: summary }] };
  },
});

// Tool: Get hourly forecast
mcpServer.tool({
  name: "get_hourly_forecast",
  description: "Get an hourly weather forecast for the next 24 hours for a location. Returns temperature, condition, and precipitation probability for each hour.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number", description: "Latitude of the location" },
      longitude: { type: "number", description: "Longitude of the location" },
      location_name: { type: "string", description: "Human-readable name of the location" },
      hours: { type: "number", description: "Number of hours to forecast (default 12, max 24)" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async ({ latitude, longitude, location_name, hours }: { latitude: number; longitude: number; location_name?: string; hours?: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ lat: latitude, lon: longitude, locationName: location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text", text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];
    const best = sources[0];
    if (!best?.hourlyForecast?.length) {
      return { content: [{ type: "text", text: "No hourly forecast available." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const limit = Math.min(hours || 12, 24);
    const lines = best.hourlyForecast.slice(0, limit).map((h: any) =>
      `${h.time} — ${fToC(h.temperature)}°C, ${h.condition}, 🌧️ ${h.precipitation}%`
    );

    return {
      content: [{
        type: "text",
        text: `⏰ Hourly Forecast for ${location_name || `${latitude}, ${longitude}`}\n\n${lines.join("\n")}`,
      }],
    };
  },
});

// Tool: Get daily forecast
mcpServer.tool({
  name: "get_daily_forecast",
  description: "Get a 7-day daily weather forecast for a location. Returns high/low temperatures, conditions, and precipitation probability.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number", description: "Latitude of the location" },
      longitude: { type: "number", description: "Longitude of the location" },
      location_name: { type: "string", description: "Human-readable name of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async ({ latitude, longitude, location_name }: { latitude: number; longitude: number; location_name?: string }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ lat: latitude, lon: longitude, locationName: location_name || "MCP Request" }),
    });

    if (!response.ok) {
      return { content: [{ type: "text", text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    const sources = data.sources || data || [];
    const best = sources[0];
    if (!best?.dailyForecast?.length) {
      return { content: [{ type: "text", text: "No daily forecast available." }] };
    }

    const fToC = (f: number) => Math.round((f - 32) * 5 / 9);
    const lines = best.dailyForecast.slice(0, 7).map((d: any) =>
      `${d.day} — ${d.condition} | High: ${fToC(d.highTemp)}°C, Low: ${fToC(d.lowTemp)}°C | 🌧️ ${d.precipitation}%`
    );

    return {
      content: [{
        type: "text",
        text: `📅 7-Day Forecast for ${location_name || `${latitude}, ${longitude}`}\n\n${lines.join("\n")}`,
      }],
    };
  },
});

// Tool: Get air quality
mcpServer.tool({
  name: "get_air_quality",
  description: "Get current air quality index (AQI) and pollen data for a location.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number", description: "Latitude of the location" },
      longitude: { type: "number", description: "Longitude of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      return { content: [{ type: "text", text: `Error: ${response.status}` }] };
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
      content: [{ type: "text", text: parts.length ? parts.join("\n") : "No air quality data available for this location." }],
    };
  },
});

// Tool: Get weather alerts
mcpServer.tool({
  name: "get_weather_alerts",
  description: "Get active severe weather alerts for a location including storms, floods, heat warnings, etc.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number", description: "Latitude of the location" },
      longitude: { type: "number", description: "Longitude of the location" },
    },
    required: ["latitude", "longitude"],
  },
  handler: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      return { content: [{ type: "text", text: `Error: ${response.status}` }] };
    }

    const data = await response.json();
    if (!data.alerts?.length) {
      return { content: [{ type: "text", text: "✅ No active weather alerts for this location." }] };
    }

    const lines = data.alerts.map((a: any) =>
      `⚠️ ${a.headline || a.event}\n   Severity: ${a.severity || "Unknown"}\n   ${a.description || ""}`
    );

    return { content: [{ type: "text", text: `🚨 Weather Alerts:\n\n${lines.join("\n\n")}` }] };
  },
});

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
