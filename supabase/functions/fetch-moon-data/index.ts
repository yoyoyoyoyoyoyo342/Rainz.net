import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const CoordinateSchema = z.object({
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lon: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = CoordinateSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates",
          moonrise: null,
          moonset: null,
          moonPhase: null
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { lat, lon } = validationResult.data;
    const MOON_API_KEY = Deno.env.get("MOON_API_KEY");

    if (!MOON_API_KEY) {
      console.error("MOON_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Moon API key not configured",
          moonrise: null,
          moonset: null,
          moonPhase: null
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Fetching moon data for lat: ${lat}, lon: ${lon}`);

    // Using ipgeolocation.io Moon API
    const response = await fetch(
      `https://api.ipgeolocation.io/astronomy?apiKey=${MOON_API_KEY}&lat=${lat}&long=${lon}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error("Moon API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ 
          error: "Service temporarily unavailable",
          moonrise: null,
          moonset: null,
          moonPhase: null
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log("Moon API response:", data);

    return new Response(
      JSON.stringify({
        moonrise: data.moonrise || null,
        moonset: data.moonset || null,
        moonPhase: data.moon_phase || null,
        moonIllumination: data.moon_illumination || null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in fetch-moon-data:", error);
    return new Response(
      JSON.stringify({ 
        error: "Service temporarily unavailable",
        moonrise: null,
        moonset: null,
        moonPhase: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
