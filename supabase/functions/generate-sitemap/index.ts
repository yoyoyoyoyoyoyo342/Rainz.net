import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://rainz.net";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/articles", priority: "0.9", changefreq: "daily" },
  { path: "/download", priority: "0.7", changefreq: "monthly" },
  { path: "/faq", priority: "0.8", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/data-settings", priority: "0.3", changefreq: "yearly" },
  { path: "/dryroutes", priority: "0.7", changefreq: "daily" },
  { path: "/mcp", priority: "0.5", changefreq: "monthly" },
  { path: "/auth", priority: "0.4", changefreq: "monthly" },
  { path: "/widgets", priority: "0.5", changefreq: "monthly" },
  { path: "/affiliate", priority: "0.4", changefreq: "monthly" },
  { path: "/info", priority: "0.7", changefreq: "monthly" },
  { path: "/market-report", priority: "0.6", changefreq: "quarterly" },
  { path: "/airport", priority: "0.6", changefreq: "monthly" },
  { path: "/airport/features", priority: "0.5", changefreq: "monthly" },
  { path: "/airport/product", priority: "0.5", changefreq: "monthly" },
  { path: "/airport/contact", priority: "0.4", changefreq: "monthly" },
];

// Top 250 city slugs — imported from the app's cities data
// We fetch city_pages from DB to get the full list dynamically
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Fetch published blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, published_at, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    // Fetch city pages
    const { data: cities } = await supabase
      .from("city_pages")
      .select("slug, updated_at")
      .order("city_name");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static routes
    for (const route of STATIC_ROUTES) {
      xml += `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
    }

    // Blog posts
    if (posts) {
      for (const post of posts) {
        const lastmod = (post.updated_at || post.published_at || today).split("T")[0];
        xml += `  <url>
    <loc>${BASE_URL}/articles/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // City pages
    if (cities) {
      for (const city of cities) {
        const lastmod = (city.updated_at || today).split("T")[0];
        xml += `  <url>
    <loc>${BASE_URL}/weather/${city.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
