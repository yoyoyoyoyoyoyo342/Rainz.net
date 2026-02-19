import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const layer = url.searchParams.get('layer');
  const z = url.searchParams.get('z');
  const x = url.searchParams.get('x');
  const y = url.searchParams.get('y');

  if (!layer || !z || !x || !y) {
    return new Response(JSON.stringify({ error: 'Missing required params: layer, z, x, y' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const validLayers = ['temp_new', 'wind_new', 'precipitation_new', 'clouds_new', 'pressure_new'];
  if (!validLayers.includes(layer)) {
    return new Response(JSON.stringify({ error: 'Invalid layer' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('OWM_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OWM_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;

  try {
    const tileResponse = await fetch(tileUrl);
    if (!tileResponse.ok) {
      return new Response(JSON.stringify({ error: `OWM tile fetch failed: ${tileResponse.status}` }), {
        status: tileResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tileData = await tileResponse.arrayBuffer();
    return new Response(tileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tile' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
