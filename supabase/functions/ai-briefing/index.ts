// Rainz 2.0 — AI Briefing (Groq streaming SSE)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface BriefingInput {
  location: string;
  current?: {
    temperature?: number;
    condition?: string;
    feelsLike?: number;
    humidity?: number;
    windSpeed?: number;
  };
  next12h?: Array<{ time: string; temperature: number; condition: string; precipitation: number }>;
  isImperial?: boolean;
  hourLocal?: number;
}

function fallbackBriefing(input: BriefingInput): string {
  const unit = input.isImperial ? "°F" : "°C";
  const t = input.current?.temperature;
  const cond = input.current?.condition ?? "mixed conditions";
  const rainHr = input.next12h?.find((h) => (h.precipitation ?? 0) > 0.2);
  const part = rainHr
    ? ` Expect ${cond.toLowerCase()} with rain near ${new Date(rainHr.time).toLocaleTimeString([], { hour: "numeric" })} — grab a layer.`
    : ` ${cond} sticks around through the day — easy out the door.`;
  return `${input.location}: ${t !== undefined ? `${Math.round(t)}${unit}, ` : ""}${cond.toLowerCase()}.${part}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let input: BriefingInput;
  try {
    input = (await req.json()) as BriefingInput;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!input?.location) {
    return new Response(JSON.stringify({ error: "location required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const unit = input.isImperial ? "°F" : "°C";
  const hour = input.hourLocal ?? new Date().getHours();
  const partOfDay =
    hour < 5 ? "late night" : hour < 11 ? "morning" : hour < 16 ? "afternoon" : hour < 21 ? "evening" : "night";

  const compactHours = (input.next12h ?? [])
    .slice(0, 12)
    .map((h) => `${new Date(h.time).getHours()}h:${Math.round(h.temperature)}${unit}/${h.condition}/${(h.precipitation ?? 0).toFixed(1)}mm`)
    .join(", ");

  const system = `You are Rainz, a Scandinavian weather AI for Gen Z and millennials in the Nordics.
Write a 2-3 sentence personal weather briefing. Conversational, warm, never robotic.
Open with the vibe (not a number). Mention temp once with unit. Call out the one thing that actually matters in the next 12h (rain window, wind, sun returning, cold snap). End with a tiny practical nudge (layer, brolly, sunglasses, ride the bike now). No emojis. No greetings. Max 60 words.`;

  const user = `Location: ${input.location}
Time: ${partOfDay} (${hour}:00 local)
Current: ${input.current?.temperature !== undefined ? `${Math.round(input.current.temperature)}${unit}` : "?"}, ${input.current?.condition ?? "?"}, feels ${input.current?.feelsLike !== undefined ? `${Math.round(input.current.feelsLike)}${unit}` : "?"}, wind ${input.current?.windSpeed ?? "?"}, humidity ${input.current?.humidity ?? "?"}%
Next 12h: ${compactHours || "no data"}`;

  // No Groq key — return fallback as a single SSE chunk so the client logic is identical.
  if (!GROQ_API_KEY) {
    const text = fallbackBriefing(input);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 160,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      console.error("Groq error", groqRes.status, await groqRes.text().catch(() => ""));
      const text = fallbackBriefing(input);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    return new Response(groqRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("ai-briefing error", e);
    const text = fallbackBriefing(input);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  }
});
