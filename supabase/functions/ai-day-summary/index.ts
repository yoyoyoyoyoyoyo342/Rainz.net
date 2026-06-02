// Rejn 2.0 — Per-day AI summary (Groq, non-streaming, cached client-side)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface DayInput {
  location?: string;
  day: string;          // e.g. "Tue" or "2026-06-22"
  highTemp: number;
  lowTemp: number;
  condition: string;
  precipitation?: number;
  windSpeed?: number;
  uvIndex?: number;
  certainty?: number;   // 0–100
  isImperial?: boolean;
}

function fallback(d: DayInput) {
  const unit = d.isImperial ? "°F" : "°C";
  const rain = (d.precipitation ?? 0) > 0.3 ? " Bring something waterproof." : "";
  return `${d.condition}, highs near ${Math.round(d.highTemp)}${unit} and lows around ${Math.round(d.lowTemp)}${unit}.${rain}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let input: DayInput;
  try {
    input = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!input?.day || input.highTemp === undefined || input.lowTemp === undefined) {
    return new Response(JSON.stringify({ error: "day, highTemp, lowTemp required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!GROQ_API_KEY) {
    return new Response(JSON.stringify({ summary: fallback(input) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const unit = input.isImperial ? "°F" : "°C";
  const system = `You are Rejn, a Scandinavian weather AI. Write ONE short, friendly sentence (max 22 words) summarizing a day's weather for a Gen Z / millennial Nordic audience. No emojis, no greetings. Mention the actionable thing if relevant (umbrella, layers, sunglasses).`;
  const user = `Day: ${input.day}${input.location ? ` in ${input.location}` : ""}
High ${Math.round(input.highTemp)}${unit}, low ${Math.round(input.lowTemp)}${unit}, ${input.condition}, precip ${input.precipitation ?? 0}mm, wind ${input.windSpeed ?? "?"} m/s, UV ${input.uvIndex ?? "?"}${input.certainty !== undefined ? `, certainty ${input.certainty}%` : ""}.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 70,
        temperature: 0.6,
      }),
    });
    if (!r.ok) throw new Error(`groq ${r.status}`);
    const data = await r.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || fallback(input);
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-day-summary", e);
    return new Response(JSON.stringify({ summary: fallback(input) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
