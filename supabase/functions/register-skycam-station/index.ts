// Rainz SkyCam — station registration endpoint.
// Any signed-in Rainz user can register a SkyCam station and receive a one-time API key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'station';
}

function generateApiKey(): string {
  // 32 random bytes -> ~43 base64url chars, prefixed for human recognisability
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `rzsky_${b64}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({})) as {
      station_name?: string;
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
      area?: string;
      camera_type?: string;
    };

    const stationName = (body.station_name ?? '').trim().slice(0, 100);
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const cameraType = body.camera_type === 'noir' ? 'noir' : 'normal';
    const city = (body.city ?? '').trim().slice(0, 80) || null;
    const country = (body.country ?? '').trim().slice(0, 80) || null;
    const area = (body.area ?? '').trim().slice(0, 80) || null;

    if (!stationName || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return new Response(JSON.stringify({ error: 'invalid_coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Generate unique station_code
    const baseSlug = slugify(stationName);
    let stationCode = `${baseSlug}-${user.id.slice(0, 6)}`;
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await admin
        .from('skycam_stations').select('id').eq('station_code', stationCode).maybeSingle();
      if (!existing) break;
      stationCode = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const apiKey = generateApiKey();
    const apiKeyHash = await sha256Hex(apiKey);

    const { data: station, error: insertErr } = await admin
      .from('skycam_stations')
      .insert({
        station_code: stationCode,
        name: stationName,
        city: city,
        area: area,
        country: country,
        latitude: lat,
        longitude: lon,
        camera_type: cameraType,
        owner_user_id: user.id,
        api_key_hash: apiKeyHash,
        is_active: true,
        is_public: false,
        coverage_radius_km: 5,
      })
      .select('id,station_code,name,camera_type,latitude,longitude,is_active,created_at')
      .single();

    if (insertErr || !station) {
      console.error('register-skycam-station insert failed', insertErr?.message);
      return new Response(JSON.stringify({ error: 'insert_failed', detail: insertErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      station,
      api_key: apiKey,
      upload_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/upload-skycam-observation`,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('register-skycam-station error', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
