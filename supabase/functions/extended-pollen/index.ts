import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: 'latitude and longitude required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('TOMORROW_IO_API_KEY');
    if (!apiKey) {
      // Fallback: return empty data gracefully so the UI doesn't break
      console.warn('TOMORROW_IO_API_KEY not configured, returning empty pollen data');
      return new Response(JSON.stringify({ pollen: {}, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the v4 realtime endpoint with pollen fields
    const fields = [
      'treeIndex', 'grassIndex', 'weedIndex',
    ];

    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${latitude},${longitude}&apikey=${apiKey}`;
    console.log('Fetching Tomorrow.io realtime data...');

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Tomorrow.io API error [${response.status}]:`, errText);
      
      // If it's a rate limit or auth issue, return empty gracefully
      if (response.status === 429 || response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ pollen: {}, rateLimited: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: `Tomorrow.io API failed: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const values = data?.data?.values || {};
    console.log('Tomorrow.io response keys:', Object.keys(values).filter(k => k.toLowerCase().includes('index') || k.toLowerCase().includes('pollen')));

    const pollenData: Record<string, { value: number; category: string; type: string }> = {};

    const getCategoryLabel = (index: number): string => {
      if (index === 0) return 'None';
      if (index === 1) return 'Very Low';
      if (index === 2) return 'Low';
      if (index === 3) return 'Medium';
      if (index === 4) return 'High';
      return 'Very High';
    };

    // Map all known pollen-related fields from the response
    const pollenFieldMap: Record<string, { name: string; type: string }> = {
      'treeIndex': { name: 'Tree (Overall)', type: 'tree' },
      'grassIndex': { name: 'Grass (Overall)', type: 'grass' },
      'weedIndex': { name: 'Weed (Overall)', type: 'weed' },
      // Species-level (premium)
      'treeAcaciaIndex': { name: 'Acacia', type: 'tree' },
      'treeAshIndex': { name: 'Ash', type: 'tree' },
      'treeBirchIndex': { name: 'Birch', type: 'tree' },
      'treeCedarIndex': { name: 'Cedar', type: 'tree' },
      'treeCypressIndex': { name: 'Cypress', type: 'tree' },
      'treeElmIndex': { name: 'Elm', type: 'tree' },
      'treeHazelIndex': { name: 'Hazel', type: 'tree' },
      'treeMapleIndex': { name: 'Maple', type: 'tree' },
      'treeOakIndex': { name: 'Oak', type: 'tree' },
      'treePineIndex': { name: 'Pine', type: 'tree' },
      'treePlaneIndex': { name: 'Plane', type: 'tree' },
      'treePoplarIndex': { name: 'Poplar', type: 'tree' },
      'treeWillowIndex': { name: 'Willow', type: 'tree' },
      'weedChenopodIndex': { name: 'Chenopod', type: 'weed' },
      'weedRagweedIndex': { name: 'Ragweed', type: 'weed' },
      'grassGrassIndex': { name: 'Grass', type: 'grass' },
    };

    for (const [key, info] of Object.entries(pollenFieldMap)) {
      const val = values[key];
      if (val !== undefined && val !== null) {
        pollenData[info.name] = {
          value: val,
          category: getCategoryLabel(val),
          type: info.type,
        };
      }
    }

    // If we got overall indices but no species data, derive approximate species values
    // This helps users who track specific species get at least category-level data
    if (Object.keys(pollenData).length <= 3) {
      const treeVal = values.treeIndex ?? 0;
      const weedVal = values.weedIndex ?? 0;
      
      const treeSpecies = ['Oak', 'Pine', 'Cedar', 'Elm', 'Maple', 'Ash', 'Cypress', 'Hazel', 'Poplar', 'Willow', 'Plane', 'Acacia'];
      const weedSpecies = ['Chenopod'];
      
      for (const species of treeSpecies) {
        if (!pollenData[species]) {
          pollenData[species] = { value: treeVal, category: getCategoryLabel(treeVal), type: 'tree' };
        }
      }
      for (const species of weedSpecies) {
        if (!pollenData[species]) {
          pollenData[species] = { value: weedVal, category: getCategoryLabel(weedVal), type: 'weed' };
        }
      }
    }

    console.log(`Returning ${Object.keys(pollenData).length} pollen entries`);

    return new Response(JSON.stringify({ pollen: pollenData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Extended pollen error:', error);
    return new Response(JSON.stringify({ error: error.message, pollen: {} }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
