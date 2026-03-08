import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory cache (per isolate)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 3 characters", results: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = query.trim().toLowerCase();

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(
        JSON.stringify({ results: cached.data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding address: ${query}`);

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    // Try up to 2 times with a delay on 429
    let data: unknown[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Rainz Weather App/1.0 (contact@rainz.net)",
          "Accept": "application/json",
        },
      });

      if (response.status === 429) {
        console.warn(`Nominatim 429 rate limit, attempt ${attempt + 1}`);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        // Return empty on second 429 — don't throw 500
        return new Response(
          JSON.stringify({ results: [], rateLimit: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        const body = await response.text();
        console.error(`Nominatim error ${response.status}: ${body}`);
        throw new Error(`Nominatim API returned ${response.status}`);
      }

      data = await response.json();
      break;
    }

    console.log(`Found ${data.length} results for query: ${query}`);

    // Store in cache
    cache.set(cacheKey, { data, ts: Date.now() });

    return new Response(
      JSON.stringify({ results: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geocode-address function:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to geocode address", results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
