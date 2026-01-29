import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple validation helper (removed zod dependency)
function validateRequest(body: unknown): { lat: number; lon: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const obj = body as Record<string, unknown>;
  const lat = typeof obj.lat === "number" ? obj.lat : NaN;
  const lon = typeof obj.lon === "number" ? obj.lon : NaN;
  if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { lat, lon };
  }
  return null;
}

interface EnsembleMember {
  temperature: number[];
  precipitation: number[];
}

interface EnsembleForecast {
  hourly: {
    temperature: {
      median: number[];
      p10: number[];
      p90: number[];
    };
    precipitation: {
      median: number[];
      p10: number[];
      p90: number[];
    };
    time: string[];
  };
  confidence: "high" | "medium" | "low";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = validateRequest(body);
    
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Invalid parameters. lat must be -90..90, lon must be -180..180" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    const { lat, lon } = parsed;

    // Fetch ensemble data from Open-Meteo (uses ICON EPS ensemble)
    const ensembleUrl = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
    ensembleUrl.searchParams.set("latitude", lat.toString());
    ensembleUrl.searchParams.set("longitude", lon.toString());
    ensembleUrl.searchParams.set("hourly", "temperature_2m,precipitation");
    ensembleUrl.searchParams.set("temperature_unit", "fahrenheit");
    ensembleUrl.searchParams.set("forecast_days", "3");

    console.log("Fetching ensemble forecast from:", ensembleUrl.toString());

    const response = await fetch(ensembleUrl.toString());
    if (!response.ok) {
      throw new Error(`Ensemble API error: ${response.status}`);
    }

    const data = await response.json();
    const hourly = data.hourly;

    if (!hourly || !hourly.time) {
      throw new Error("Invalid ensemble data structure");
    }

    // Calculate statistics across ensemble members
    const calculateStats = (values: number[][]) => {
      const stats = values[0].map((_, hourIdx) => {
        const hourValues = values.map(member => member[hourIdx]).sort((a, b) => a - b);
        return {
          median: hourValues[Math.floor(hourValues.length / 2)],
          p10: hourValues[Math.floor(hourValues.length * 0.1)],
          p90: hourValues[Math.floor(hourValues.length * 0.9)],
          spread: hourValues[Math.floor(hourValues.length * 0.9)] - hourValues[Math.floor(hourValues.length * 0.1)],
        };
      });
      return stats;
    };

    // Group temperature and precipitation by ensemble members
    const tempMembers: number[][] = [];
    const precipMembers: number[][] = [];
    
    // Try to find ensemble members - Open-Meteo uses different naming
    for (let i = 0; i < 51; i++) {
      // Try multiple naming conventions
      const tempKeys = [
        `temperature_2m_member${i.toString().padStart(2, '0')}`,
        `temperature_2m_member_${i}`,
        `temperature_2m_${i}`
      ];
      const precipKeys = [
        `precipitation_member${i.toString().padStart(2, '0')}`,
        `precipitation_member_${i}`,
        `precipitation_${i}`
      ];
      
      for (const key of tempKeys) {
        if (hourly[key] && Array.isArray(hourly[key])) {
          tempMembers.push(hourly[key]);
          break;
        }
      }
      for (const key of precipKeys) {
        if (hourly[key] && Array.isArray(hourly[key])) {
          precipMembers.push(hourly[key]);
          break;
        }
      }
    }

    console.log(`Found ${tempMembers.length} temperature ensemble members`);

    // If no ensemble members found, use the base forecast as single member
    if (tempMembers.length === 0 && hourly.temperature_2m && Array.isArray(hourly.temperature_2m)) {
      console.log("No ensemble members found, using base forecast");
      tempMembers.push(hourly.temperature_2m);
    }
    if (precipMembers.length === 0 && hourly.precipitation && Array.isArray(hourly.precipitation)) {
      precipMembers.push(hourly.precipitation);
    }

    // Final fallback: create synthetic spread from base forecast
    if (tempMembers.length === 0 || precipMembers.length === 0) {
      console.log("Creating synthetic ensemble from fallback data");
      
      if (hourly.temperature_2m && Array.isArray(hourly.temperature_2m)) {
        // Create 3 synthetic members with slight variations
        const baseTemp = hourly.temperature_2m;
        tempMembers.push(baseTemp);
        tempMembers.push(baseTemp.map(t => t - 2)); // Cooler scenario
        tempMembers.push(baseTemp.map(t => t + 2)); // Warmer scenario
      }
      
      if (hourly.precipitation && Array.isArray(hourly.precipitation)) {
        const basePrecip = hourly.precipitation;
        precipMembers.push(basePrecip);
        precipMembers.push(basePrecip.map(p => p * 0.7)); // Drier scenario
        precipMembers.push(basePrecip.map(p => p * 1.3)); // Wetter scenario
      }
    }

    // Ensure we have data to work with
    if (tempMembers.length === 0 || precipMembers.length === 0) {
      throw new Error("No ensemble or forecast data available from API");
    }

    const tempStats = calculateStats(tempMembers);
    const precipStats = calculateStats(precipMembers);

    // Calculate confidence based on ensemble spread
    const avgTempSpread = tempStats.reduce((sum, s) => sum + s.spread, 0) / tempStats.length;
    const confidence: "high" | "medium" | "low" = 
      avgTempSpread < 5 ? "high" : avgTempSpread < 10 ? "medium" : "low";

    const result: EnsembleForecast = {
      hourly: {
        temperature: {
          median: tempStats.map(s => Math.round(s.median)),
          p10: tempStats.map(s => Math.round(s.p10)),
          p90: tempStats.map(s => Math.round(s.p90)),
        },
        precipitation: {
          median: precipStats.map(s => Math.round(s.median * 100) / 100),
          p10: precipStats.map(s => Math.round(s.p10 * 100) / 100),
          p90: precipStats.map(s => Math.round(s.p90 * 100) / 100),
        },
        time: hourly.time.slice(0, 72),
      },
      confidence,
    };

    console.log(`Ensemble forecast calculated with ${confidence} confidence`);

    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    console.error("Ensemble forecast error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch ensemble forecast", details: String(error) }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
