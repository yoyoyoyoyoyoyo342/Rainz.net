const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

const CATEGORY_QUERIES: Record<string, string> = {
  restaurant: '["amenity"="restaurant"]',
  cafe: '["amenity"="cafe"]',
  shop: '["shop"]',
  pharmacy: '["amenity"="pharmacy"]',
  supermarket: '["shop"="supermarket"]',
  atm: '["amenity"="atm"]',
  fuel: '["amenity"="fuel"]',
  hospital: '["amenity"="hospital"]',
  hotel: '["tourism"="hotel"]',
  parking: '["amenity"="parking"]',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, category, radius = 1000 } = await req.json();

    const parsedLat = Number(lat);
    const parsedLon = Number(lon);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon) || !category) {
      return new Response(
        JSON.stringify({ error: 'Valid lat, lon, and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = `${parsedLat.toFixed(3)}_${parsedLon.toFixed(3)}_${category}_${radius}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const osmFilter = CATEGORY_QUERIES[category];
    if (!osmFilter) {
      return new Response(
        JSON.stringify({ error: `Unknown category: ${category}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = `
      [out:json][timeout:10];
      (
        node${osmFilter}(around:${radius},${parsedLat},${parsedLon});
        way${osmFilter}(around:${radius},${parsedLat},${parsedLon});
      );
      out center body 20;
    `;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      throw new Error(`Overpass API error: ${res.status}`);
    }

    const data = await res.json();

    const pois = (data.elements || [])
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        id: el.id,
        name: el.tags.name,
        type: el.tags.amenity || el.tags.shop || el.tags.tourism || category,
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        address: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(' ') || null,
        phone: el.tags.phone || null,
        website: el.tags.website || null,
        opening_hours: el.tags.opening_hours || null,
      }))
      .filter((p: any) => p.lat && p.lon);

    const result = { pois, count: pois.length };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('POI search error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search nearby POIs', pois: [], count: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
