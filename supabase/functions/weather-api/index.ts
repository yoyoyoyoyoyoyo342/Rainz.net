import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEATHER-API] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep("Request received", { method: req.method });

    // Check for API key authentication first (x-api-key header)
    const apiKeyHeader = req.headers.get('x-api-key');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string | null = null;
    let authMethod: 'api_key' | 'jwt' = 'jwt';

    if (apiKeyHeader) {
      // Validate API key
      logStep("Checking API key authentication");
      
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('api_key', apiKeyHeader)
        .eq('is_active', true)
        .single();

      if (apiKeyError || !apiKeyData) {
        logStep("Invalid API key", { error: apiKeyError?.message });
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if the user who owns this API key is an admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', apiKeyData.user_id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        logStep("API key owner is not admin", { userId: apiKeyData.user_id });
        return new Response(
          JSON.stringify({ error: 'API key owner must have admin privileges' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKeyData.id);

      // Log API usage
      await supabase
        .from('api_usage')
        .insert({
          user_id: apiKeyData.user_id,
          api_key: apiKeyHeader,
          endpoint: '/weather-api',
          response_status: 200
        });

      userId = apiKeyData.user_id;
      authMethod = 'api_key';
      logStep("API key authenticated", { userId, keyName: apiKeyData.name });

    } else if (authHeader) {
      // Validate JWT token
      logStep("Checking JWT authentication");
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        logStep("Invalid JWT", { error: authError?.message });
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
        logStep("User is not admin", { userId: user.id });
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
      logStep("JWT authenticated", { userId });

    } else {
      logStep("No authentication provided");
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          details: 'Provide either x-api-key header with your API key or Authorization header with Bearer token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    logStep("Fetching weather data", { lat, lon, locationName });

    // Fetch aggregate weather data from multiple sources
    const aggregateResponse = await fetch(`${supabaseUrl}/functions/v1/aggregate-weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ lat, lon, locationName: locationName || 'API Request' }),
    });

    if (!aggregateResponse.ok) {
      const errorText = await aggregateResponse.text();
      logStep("Aggregate weather fetch failed", { status: aggregateResponse.status, error: errorText });
      throw new Error('Failed to fetch aggregate weather data');
    }

    const aggregateData = await aggregateResponse.json();
    // aggregate-weather returns { sources: [...] }, extract the array
    const sources: WeatherSource[] = aggregateData.sources || aggregateData || [];
    logStep("Received weather sources", { count: sources.length, isArray: Array.isArray(sources) });

    // Fetch LLM-enhanced forecast using Groq
    let llmForecast = null;
    try {
      logStep("Fetching LLM-enhanced forecast");
      
      const llmResponse = await fetch(`${supabaseUrl}/functions/v1/llm-weather-forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          sources, 
          location: locationName || `${lat}, ${lon}`,
          forceExperimental: true // Always use AI for API
        }),
      });

      if (llmResponse.ok) {
        llmForecast = await llmResponse.json();
        logStep("LLM forecast received", { 
          hasInsights: !!llmForecast?.insights?.length,
          modelAgreement: llmForecast?.modelAgreement 
        });
      } else {
        const llmError = await llmResponse.text();
        logStep("LLM forecast failed", { status: llmResponse.status, error: llmError });
      }
    } catch (llmError) {
      logStep("LLM forecast error", { error: llmError.message });
    }

    // Fetch hyperlocal data (precipitation, snow, AQI, pollen)
    let hyperlocalData = null;
    try {
      logStep("Fetching hyperlocal data");
      
      const hyperlocalResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-hyperlocal-weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });

      if (hyperlocalResponse.ok) {
        hyperlocalData = await hyperlocalResponse.json();
        logStep("Hyperlocal data received");
      } else {
        const hyperError = await hyperlocalResponse.text();
        logStep("Hyperlocal fetch failed", { status: hyperlocalResponse.status, error: hyperError });
      }
    } catch (hyperlocalError) {
      logStep("Hyperlocal fetch error", { error: hyperlocalError.message });
    }

    // Find most accurate source (handle empty array)
    const mostAccurate = sources.length > 0 ? sources.reduce((best, current) => {
      const bestAccuracy = (best as any).accuracy || 0;
      const currentAccuracy = (current as any).accuracy || 0;
      return currentAccuracy > bestAccuracy ? current : best;
    }, sources[0]) : null;

    // Construct comprehensive response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      authMethod,
      location: {
        name: locationName || 'API Request',
        latitude: lat,
        longitude: lon,
      },
      sources: sources.map(s => ({
        name: s.source,
        current: s.currentWeather,
        hourly: s.hourlyForecast?.slice(0, 24),
        daily: s.dailyForecast?.slice(0, 7),
      })),
      mostAccurate: mostAccurate ? {
        source: mostAccurate.source,
        current: mostAccurate.currentWeather,
        hourly: mostAccurate.hourlyForecast?.slice(0, 24),
        daily: mostAccurate.dailyForecast?.slice(0, 7),
      } : null,
      aiEnhanced: llmForecast ? {
        current: llmForecast.current,
        hourly: llmForecast.hourly?.slice(0, 24),
        daily: llmForecast.daily?.slice(0, 7),
        summary: llmForecast.summary,
        insights: llmForecast.insights,
        modelAgreement: llmForecast.modelAgreement,
        source: llmForecast.source || 'Groq Llama 3.3'
      } : null,
      hyperlocal: hyperlocalData ? {
        minuteByMinute: hyperlocalData.minuteByMinute,
        snow: hyperlocalData.snow,
        aqi: hyperlocalData.aqi,
        pollen: hyperlocalData.pollen,
        astronomy: hyperlocalData.astronomy,
        alerts: hyperlocalData.alerts,
      } : null,
      metadata: {
        sourceCount: sources.length,
        aiEnhanced: !!llmForecast,
        hasHyperlocalData: !!hyperlocalData,
      }
    };

    logStep("Response generated successfully", { 
      sources: sources.length, 
      hasAI: !!llmForecast, 
      hasHyperlocal: !!hyperlocalData 
    });

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
