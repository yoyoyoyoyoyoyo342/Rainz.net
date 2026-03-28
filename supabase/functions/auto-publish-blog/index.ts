import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEATHER_TOPICS = [
  {
    title: "How AI Is Changing Weather Forecasting in {year}",
    slug: "ai-changing-weather-forecasting-{year}",
    prompt:
      "Write a 600-word blog post about how artificial intelligence is transforming weather forecasting. Cover ensemble models, machine learning for precipitation nowcasting, and how apps like Rainz Weather use AI (Groq Llama models) to aggregate data from ECMWF, GFS, Met.no, Tomorrow.io, WeatherAPI, and Open-Meteo. Keep it educational but accessible. Include practical examples. End with a brief mention that Rainz Weather offers free AI-enhanced forecasts at rainz.net.",
  },
  {
    title: "Ensemble Forecasting Explained: Why Multiple Models Beat One",
    slug: "ensemble-forecasting-explained-{date}",
    prompt:
      "Write a 600-word blog post explaining ensemble weather forecasting in simple terms. Cover what it is, why averaging multiple models (ECMWF, GFS, etc.) reduces errors by 20-40%, and how Rainz Weather applies this technique with 7+ sources. Use analogies to make it accessible. Include a section on confidence scores.",
  },
  {
    title: "Best Weather Apps for Allergy Sufferers in {year}",
    slug: "best-weather-apps-allergy-sufferers-{year}",
    prompt:
      "Write a 600-word blog post about weather apps that help allergy sufferers. Discuss pollen tracking features, AQI monitoring, and allergen alerts. Mention that Rainz Weather provides free pollen tracking for grass, tree, and weed pollen with severity forecasts and customizable alerts. Keep it helpful and informative.",
  },
  {
    title: "How Accurate Are 10-Day Weather Forecasts Really?",
    slug: "how-accurate-10-day-forecasts-{date}",
    prompt:
      "Write a 600-word blog post about the accuracy of extended weather forecasts. Cover why accuracy drops with range (days 1-3: 80-90%, days 4-7: 50-70%, days 8-10: 40-60%), what factors affect accuracy, and how ensemble forecasting improves reliability. Mention that Rainz Weather uses 7+ models with AI analysis to maximize accuracy at all ranges.",
  },
  {
    title: "Understanding the UV Index: A Complete Guide",
    slug: "understanding-uv-index-guide-{date}",
    prompt:
      "Write a 600-word blog post explaining the UV index in practical terms. Cover what UV levels mean (low to extreme), skin protection recommendations, how UV varies by season and location, and why checking UV daily matters. Mention that Rainz Weather provides free real-time UV index monitoring.",
  },
  {
    title: "Weather Gamification: Making Forecasting Fun",
    slug: "weather-gamification-making-forecasting-fun-{date}",
    prompt:
      "Write a 600-word blog post about weather gamification — the concept of turning weather prediction into a game. Discuss citizen science, prediction markets, and how apps like Rainz Weather let users make daily predictions, compete on leaderboards, challenge friends to prediction battles, and earn points. Explain the scoring system (+300 for all correct, -100 for all wrong).",
  },
  {
    title: "What Is Air Quality Index (AQI) and Why Should You Care?",
    slug: "air-quality-index-explained-{date}",
    prompt:
      "Write a 600-word blog post explaining AQI in simple terms. Cover PM2.5, PM10, ozone, what the AQI numbers mean for health, who is most at risk, and practical steps to protect yourself on bad air days. Mention that Rainz Weather provides free real-time AQI monitoring with health guidance.",
  },
  {
    title: "How Weather Apps Get Your Local Forecast",
    slug: "how-weather-apps-get-local-forecast-{date}",
    prompt:
      "Write a 600-word blog post explaining how weather apps deliver hyper-local forecasts. Cover NWP models, observation stations, interpolation, and why multi-source apps like Rainz Weather (using 7+ data sources) provide better local accuracy than single-source apps.",
  },
  {
    title: "The Science Behind Wind Chill and Feels-Like Temperature",
    slug: "wind-chill-feels-like-temperature-science-{date}",
    prompt:
      "Write a 600-word blog post explaining wind chill and feels-like temperature. Cover the physics, the wind chill formula, heat index for summer, and why these metrics matter for outdoor activities. Mention that Rainz Weather displays both actual and feels-like temperatures.",
  },
  {
    title: "Pollen Season Guide: When Allergies Peak and How to Prepare",
    slug: "pollen-season-guide-allergies-{date}",
    prompt:
      "Write a 600-word blog post about pollen seasons worldwide. Cover which pollen types peak when (tree in spring, grass in summer, weed in fall), regional variations, and practical tips for allergy sufferers. Mention that Rainz Weather offers free pollen tracking and allergy alerts.",
  },
  {
    title: "Progressive Web Apps: Why Weather Apps Don't Need App Stores",
    slug: "progressive-web-apps-weather-{date}",
    prompt:
      "Write a 600-word blog post about PWAs and their advantages for weather apps. Cover what a PWA is, offline support, instant installation, cross-platform compatibility, and why Rainz Weather chose PWA over native apps. Include installation instructions.",
  },
  {
    title: "Reading Weather Radar Maps: A Beginner's Guide",
    slug: "reading-weather-radar-maps-guide-{date}",
    prompt:
      "Write a 600-word blog post teaching readers how to read weather radar maps. Cover color scales, reflectivity, storm cell identification, and how to predict rain arrival. Mention that Rainz Weather includes a free interactive weather radar map.",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const year = now.getFullYear().toString();

    // Pick a random topic
    const topic = WEATHER_TOPICS[Math.floor(Math.random() * WEATHER_TOPICS.length)];
    const title = topic.title.replace("{year}", year).replace("{date}", dateStr);
    const slug = topic.slug.replace("{year}", year).replace("{date}", dateStr);

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Post with this slug already exists", slug }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate content via Groq
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a professional weather science writer for Rainz Weather (rainz.net). Write engaging, accurate, SEO-optimized blog posts in Markdown format. Use ## for section headings. Do NOT include the title as an H1 — start directly with the content. Keep the tone informative but accessible. Include relevant statistics and practical advice.",
            },
            { role: "user", content: topic.prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} ${err}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated from Groq");
    }

    // Generate excerpt (first ~150 chars of content, cleaned of markdown)
    const plainText = content.replace(/[#*_`\[\]()]/g, "").trim();
    const excerpt = plainText.substring(0, 155).replace(/\s+\S*$/, "") + "...";

    // Get admin user for author_id
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      throw new Error("No admin user found to author the post");
    }

    // Insert blog post
    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        content,
        excerpt,
        author_id: adminRole.user_id,
        is_published: true,
        published_at: now.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Insert error: ${insertError.message}`);
    }

    console.log(`Published auto-generated blog post: ${title} (${slug})`);

    return new Response(
      JSON.stringify({
        success: true,
        post: { id: post.id, title, slug },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auto-publish error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
