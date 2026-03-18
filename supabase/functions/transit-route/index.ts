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
    const { fromLat, fromLon, toLat, toLon, time, arriveBy } = await req.json();

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return new Response(
        JSON.stringify({ error: "Missing coordinates" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const departureTime = time || new Date().toISOString();
    const url = new URL('https://api.transitous.org/api/v1/plan');
    url.searchParams.set('fromPlace', `${fromLat},${fromLon}`);
    url.searchParams.set('toPlace', `${toLat},${toLon}`);
    url.searchParams.set('time', departureTime);
    url.searchParams.set('arriveBy', arriveBy ? 'true' : 'false');

    console.log(`Transit route: ${fromLat},${fromLon} -> ${toLat},${toLon}`);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Rainz Weather App/1.0 (contact@rainz.net)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Transitous API error ${response.status}: ${body}`);
      return new Response(
        JSON.stringify({ error: `Transit API returned ${response.status}`, itineraries: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Parse MOTIS response into simplified itineraries
    const itineraries = (data.itineraries || []).slice(0, 5).map((itin: any) => {
      const legs = (itin.legs || []).map((leg: any) => {
        // Decode polyline geometry if present
        let geometry: [number, number][] = [];
        if (leg.legGeometry?.points) {
          geometry = decodePolyline(leg.legGeometry.points);
        }

        return {
          mode: leg.mode, // WALK, BUS, RAIL, SUBWAY, TRAM, FERRY, etc.
          from: {
            name: leg.from?.name || 'Unknown',
            lat: leg.from?.lat,
            lon: leg.from?.lon,
            departure: leg.from?.departure || leg.startTime,
          },
          to: {
            name: leg.to?.name || 'Unknown',
            lat: leg.to?.lat,
            lon: leg.to?.lon,
            arrival: leg.to?.arrival || leg.endTime,
          },
          startTime: leg.startTime,
          endTime: leg.endTime,
          duration: leg.duration,
          distance: leg.distance || 0,
          routeShortName: leg.routeShortName || null,
          routeLongName: leg.routeLongName || null,
          routeColor: leg.routeColor || null,
          agencyName: leg.agencyName || null,
          headsign: leg.headsign || null,
          geometry,
        };
      });

      return {
        duration: itin.duration,
        startTime: itin.startTime,
        endTime: itin.endTime,
        transfers: itin.transfers || 0,
        legs,
      };
    });

    // Also include direct walking routes
    const directRoutes = (data.direct || []).slice(0, 1).map((d: any) => {
      const legs = (d.legs || []).map((leg: any) => ({
        mode: leg.mode,
        from: { name: leg.from?.name, lat: leg.from?.lat, lon: leg.from?.lon, departure: leg.from?.departure },
        to: { name: leg.to?.name, lat: leg.to?.lat, lon: leg.to?.lon, arrival: leg.to?.arrival },
        startTime: leg.startTime,
        endTime: leg.endTime,
        duration: leg.duration,
        distance: leg.distance || 0,
        geometry: leg.legGeometry?.points ? decodePolyline(leg.legGeometry.points) : [],
      }));
      return { duration: d.duration, startTime: d.startTime, endTime: d.endTime, transfers: 0, legs, isDirect: true };
    });

    return new Response(
      JSON.stringify({ itineraries, directRoutes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transit-route function:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get transit route", itineraries: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Decode Google-encoded polyline (precision 6 for MOTIS)
function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const factor = Math.pow(10, precision);
  const points: [number, number][] = [];
  let lat = 0, lng = 0, index = 0;

  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push([lat / factor, lng / factor]);
  }
  return points;
}
