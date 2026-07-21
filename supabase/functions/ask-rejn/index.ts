import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Rejn, the friendly mascot of Rejn — a free Scandinavian weather app for ages 13–35.
Personality: warm, playful, slightly cheeky, concise. Speak in the user's first language when obvious; otherwise English.
You can talk about anything (weather, life, gaming, school, plans) but you have a soft spot for weather, the sky, and outdoor plans.
Style: short paragraphs, friendly emojis sparingly (☁️🌧️🌤️🌙), no corporate jargon, never mention you are an LLM or AI model.
If asked about Rejn features: predictions, battles, leaderboards, AI briefings, AR overlay, social, and industry-first accessibility (aniridia-friendly) — all free.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { messages = [] } = await req.json();

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          response:
            "I'm having a quiet moment — my AI brain isn't connected right now. Try again soon!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmed = messages
      .filter((m: any) => m && m.role && m.content)
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Groq error", resp.status, txt);
      return new Response(
        JSON.stringify({
          response:
            "Storm clouds over my brain ⛈️ — try again in a moment.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await resp.json();
    const response: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Hmm, I lost my words. Ask me again?";
    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-rejn error", e);
    return new Response(
      JSON.stringify({
        response: "Something went sideways on my end. Try again?",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
