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
      return new Response(JSON.stringify({ error: 'TOMORROW_IO_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tomorrow.io pollen fields - species-level data
    const fields = [
      'treeIndex', 'grassIndex', 'weedIndex',
      'treeAcaciaIndex', 'treeAshIndex', 'treeBirchIndex', 'treeCedarIndex',
      'treeCypressIndex', 'treeElmIndex', 'treeHazelIndex', 'treeMapleIndex',
      'treeOakIndex', 'treePineIndex', 'treePlaneIndex', 'treePoplarIndex',
      'treeWillowIndex',
      'weedChenopodIndex', 'weedRagweedIndex', 'weedGrassIndex',
      'grassGrassIndex',
    ];

    const url = `https://api.tomorrow.io/v4/timelines?location=${latitude},${longitude}&fields=${fields.join(',')}&timesteps=current&units=metric&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Tomorrow.io API error [${response.status}]:`, errText);
      return new Response(JSON.stringify({ error: `Tomorrow.io API failed: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const values = data?.data?.timelines?.[0]?.intervals?.[0]?.values || {};

    // Map to a clean structure
    const pollenData: Record<string, { value: number; category: string; type: string }> = {};

    const getCategoryLabel = (index: number): string => {
      if (index === 0) return 'None';
      if (index === 1) return 'Very Low';
      if (index === 2) return 'Low';
      if (index === 3) return 'Medium';
      if (index === 4) return 'High';
      return 'Very High';
    };

    const treeSpecies = [
      { key: 'treeAcaciaIndex', name: 'Acacia' },
      { key: 'treeAshIndex', name: 'Ash' },
      { key: 'treeBirchIndex', name: 'Birch' },
      { key: 'treeCedarIndex', name: 'Cedar' },
      { key: 'treeCypressIndex', name: 'Cypress' },
      { key: 'treeElmIndex', name: 'Elm' },
      { key: 'treeHazelIndex', name: 'Hazel' },
      { key: 'treeMapleIndex', name: 'Maple' },
      { key: 'treeOakIndex', name: 'Oak' },
      { key: 'treePineIndex', name: 'Pine' },
      { key: 'treePlaneIndex', name: 'Plane' },
      { key: 'treePoplarIndex', name: 'Poplar' },
      { key: 'treeWillowIndex', name: 'Willow' },
    ];

    const weedSpecies = [
      { key: 'weedChenopodIndex', name: 'Chenopod' },
      { key: 'weedRagweedIndex', name: 'Ragweed' },
      { key: 'weedGrassIndex', name: 'Weed Grass' },
    ];

    // Overall indices
    if (values.treeIndex !== undefined) {
      pollenData['Tree (Overall)'] = { value: values.treeIndex, category: getCategoryLabel(values.treeIndex), type: 'tree' };
    }
    if (values.grassIndex !== undefined) {
      pollenData['Grass (Overall)'] = { value: values.grassIndex, category: getCategoryLabel(values.grassIndex), type: 'grass' };
    }
    if (values.weedIndex !== undefined) {
      pollenData['Weed (Overall)'] = { value: values.weedIndex, category: getCategoryLabel(values.weedIndex), type: 'weed' };
    }

    for (const species of [...treeSpecies, ...weedSpecies]) {
      const val = values[species.key];
      if (val !== undefined && val !== null) {
        pollenData[species.name] = {
          value: val,
          category: getCategoryLabel(val),
          type: species.key.startsWith('tree') ? 'tree' : 'weed',
        };
      }
    }

    if (values.grassGrassIndex !== undefined) {
      pollenData['Grass'] = { value: values.grassGrassIndex, category: getCategoryLabel(values.grassGrassIndex), type: 'grass' };
    }

    return new Response(JSON.stringify({ pollen: pollenData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Extended pollen error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
