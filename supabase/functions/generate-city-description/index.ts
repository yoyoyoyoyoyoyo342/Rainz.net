import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, city_name, country, latitude, longitude } = await req.json();

    if (!slug || !city_name || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already cached
    const { data: existing } = await supabase
      .from("city_pages")
      .select("description")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.description) {
      return new Response(JSON.stringify({ description: existing.description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate with Groq
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Write exactly 2-3 sentences about the typical weather patterns and rainfall in ${city_name}, ${country || ""}. Focus on what makes the weather unique there, average rainfall, and best/worst seasons for rain. Be specific and informative. Do not use markdown formatting.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a concise weather expert writing SEO-friendly city weather descriptions for a weather app called Rainz." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqRes.json();
    const description = groqData.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache in Supabase
    const { error: insertError } = await supabase.from("city_pages").upsert(
      { slug, city_name, country, latitude, longitude, description },
      { onConflict: "slug" }
    );

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
