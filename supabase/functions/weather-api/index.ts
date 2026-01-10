import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherSource {
  source: string;
  currentWeather: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    pressure: number;
  };
  hourlyForecast: Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitation: number;
  }>;
  dailyForecast: Array<{
    day: string;
    condition: string;
    highTemp: number;
    lowTemp: number;
    precipitation: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { lat, lon, locationName } = await req.json();

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates. Provide lat and lon as numbers.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin API request for location: ${locationName || 'Unknown'} (${lat}, ${lon})`);

    // Fetch aggregate weather data from multiple sources
    const aggregateResponse = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ lat, lon, locationName: locationName || 'API Request' }),
    });

    if (!aggregateResponse.ok) {
      console.error('Aggregate weather fetch failed:', await aggregateResponse.text());
      throw new Error('Failed to fetch aggregate weather data');
    }

    const sources: WeatherSource[] = await aggregateResponse.json();
    console.log(`Received ${sources.length} weather sources`);

    // Fetch LLM-enhanced forecast
    let llmForecast = null;
    try {
      const llmResponse = await fetch(`${supabaseUrl}/functions/v1/llm-weather-forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ sources, location: locationName || `${lat}, ${lon}` }),
      });

      if (llmResponse.ok) {
        llmForecast = await llmResponse.json();
        console.log('LLM forecast received successfully');
      } else {
        console.warn('LLM forecast failed, using raw data');
      }
    } catch (llmError) {
      console.error('LLM forecast error:', llmError);
    }

    // Fetch hyperlocal data (precipitation, snow, AQI, pollen)
    let hyperlocalData = null;
    try {
      const hyperlocalResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });

      if (hyperlocalResponse.ok) {
        hyperlocalData = await hyperlocalResponse.json();
        console.log('Hyperlocal data received successfully');
      }
    } catch (hyperlocalError) {
      console.error('Hyperlocal fetch error:', hyperlocalError);
    }

    // Find most accurate source (highest accuracy rating)
    const mostAccurate = sources.reduce((best, current) => {
      const bestAccuracy = (best as any).accuracy || 0;
      const currentAccuracy = (current as any).accuracy || 0;
      return currentAccuracy > bestAccuracy ? current : best;
    }, sources[0]);

    // Construct comprehensive response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      location: {
        name: locationName || 'API Request',
        latitude: lat,
        longitude: lon,
      },
      sources: sources.map(s => ({
        name: s.source,
        current: s.currentWeather,
        hourly: s.hourlyForecast,
        daily: s.dailyForecast,
      })),
      mostAccurate: {
        source: (mostAccurate as any).source,
        current: mostAccurate.currentWeather,
        hourly: mostAccurate.hourlyForecast,
        daily: mostAccurate.dailyForecast,
      },
      aiEnhanced: llmForecast ? {
        current: llmForecast.current,
        hourly: llmForecast.hourly,
        daily: llmForecast.daily,
        summary: llmForecast.summary,
        insights: llmForecast.insights,
        modelAgreement: llmForecast.modelAgreement,
      } : null,
      hyperlocal: hyperlocalData ? {
        minuteByMinute: hyperlocalData.minuteByMinute,
        snow: hyperlocalData.snow,
        aqi: hyperlocalData.aqi,
        pollen: hyperlocalData.pollen,
        astronomy: hyperlocalData.astronomy,
        alerts: hyperlocalData.alerts,
      } : null,
      sourceCount: sources.length,
    };

    console.log('Admin API response generated successfully');

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Weather API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
