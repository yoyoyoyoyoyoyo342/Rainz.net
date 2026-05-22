// Rainz SkyCam — permanent station upload endpoint.
// Accepts multipart/form-data from Raspberry Pi (or any) stations.
// Validates upload key, stores image, runs Groq AI analysis, updates latest, deletes previous image.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'skycam-images';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// ---- SkyCam AI prompt (kept in sync with src/lib/skycam/analyzeSkyImage.ts) ----
const SYSTEM_PROMPT = `You are Rainz SkyCam, an automated weather verification AI.
You receive a single photo of the sky and must analyse what the weather looks like RIGHT NOW.
Return STRICT JSON only. Do not include markdown, prose, or commentary.

Rules:
- Do not claim rain_visible unless rain is actually visible in the image.
- If clouds are dark/heavy, you MAY set rain_likely_soon=true, but reflect uncertainty in ai_confidence.
- If the image is too dark, blurry, blocked, indoor, pointed at the ground, or not mostly sky: set image_quality_score low (<40) and prefer "unknown" / null.
- If you cannot judge confidently, return null or "unknown" rather than guessing.
- cloud_cover_percent: integer 0-100. condition_label one of: clear, partly_cloudy, cloudy, overcast, rain, snow, fog, storm, unknown.
- ai_confidence: 0-1. image_quality_score: 0-100.`;

const USER_PROMPT = `Analyse this sky photo. Return JSON with EXACT keys:
{"cloud_cover_percent":number|null,"condition_label":"clear"|"partly_cloudy"|"cloudy"|"overcast"|"rain"|"snow"|"fog"|"storm"|"unknown"|null,"rain_visible":boolean|null,"snow_visible":boolean|null,"fog_visible":boolean|null,"dark_clouds_visible":boolean|null,"rain_likely_soon":boolean|null,"rain_likely_reason":string|null,"image_quality_score":number|null,"ai_confidence":number|null}
Return JSON only.`;

const VALID_CONDITIONS = new Set([
  'clear', 'partly_cloudy', 'cloudy', 'overcast', 'rain', 'snow', 'fog', 'storm', 'unknown',
]);

type AnalysisResult = {
  cloud_cover_percent: number | null;
  condition_label: string | null;
  rain_visible: boolean | null;
  snow_visible: boolean | null;
  fog_visible: boolean | null;
  dark_clouds_visible: boolean | null;
  rain_likely_soon: boolean | null;
  rain_likely_reason: string | null;
  image_quality_score: number | null;
  ai_confidence: number | null;
  raw_ai_result: unknown | null;
};

function emptyAnalysis(): AnalysisResult {
  return {
    cloud_cover_percent: null, condition_label: null, rain_visible: null,
    snow_visible: null, fog_visible: null, dark_clouds_visible: null,
    rain_likely_soon: null, rain_likely_reason: null,
    image_quality_score: null, ai_confidence: null, raw_ai_result: null,
  };
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}
function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 240) : null;
}
function cond(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const lower = v.toLowerCase().trim();
  return VALID_CONDITIONS.has(lower) ? lower : null;
}

function parseAI(rawText: string): AnalysisResult {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(rawText); }
  catch {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
  }
  return {
    cloud_cover_percent: num(parsed.cloud_cover_percent),
    condition_label: cond(parsed.condition_label),
    rain_visible: bool(parsed.rain_visible),
    snow_visible: bool(parsed.snow_visible),
    fog_visible: bool(parsed.fog_visible),
    dark_clouds_visible: bool(parsed.dark_clouds_visible),
    rain_likely_soon: bool(parsed.rain_likely_soon),
    rain_likely_reason: str(parsed.rain_likely_reason),
    image_quality_score: num(parsed.image_quality_score),
    ai_confidence: num(parsed.ai_confidence),
    raw_ai_result: parsed,
  };
}

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return btoa(bin);
}

export async function analyzeWithGroq(
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<{ ok: boolean; result: AnalysisResult; error?: string }> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return { ok: false, result: emptyAnalysis(), error: 'GROQ_API_KEY missing' };

  try {
    const b64 = await arrayBufferToBase64(imageBytes);
    const dataUrl = `data:${mimeType};base64,${b64}`;

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        temperature: 0.1,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, result: emptyAnalysis(), error: `Groq ${resp.status}: ${errText.slice(0, 200)}` };
    }
    const json = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '';
    return { ok: true, result: parseAI(content) };
  } catch (e) {
    return { ok: false, result: emptyAnalysis(), error: e instanceof Error ? e.message : 'AI error' };
  }
}

// ---- Upload key verification ----
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // API key arrives in Authorization: Bearer <key> header
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const apiKey = bearerMatch ? bearerMatch[1].trim() : '';

    const form = await req.formData();
    const image = form.get('image');
    const capturedAtRaw = String(form.get('captured_at') ?? '').trim();
    const firmwareVersion = String(form.get('firmware_version') ?? '').slice(0, 64);

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'missing_api_key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!(image instanceof File) || image.size === 0) {
      return new Response(JSON.stringify({ success: false, error: 'missing_image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (image.size > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'image_too_large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const capturedAt = capturedAtRaw && !Number.isNaN(Date.parse(capturedAtRaw))
      ? new Date(capturedAtRaw).toISOString()
      : new Date().toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const apiKeyHash = await sha256Hex(apiKey);
    const { data: station, error: stationErr } = await admin
      .from('skycam_stations')
      .select('id,station_code,is_active')
      .eq('api_key_hash', apiKeyHash)
      .maybeSingle();
    if (stationErr || !station) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_api_key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!station.is_active) {
      return new Response(JSON.stringify({ success: false, error: 'station_inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // Build storage path
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const ts = now.getTime();
    const imagePath = `skycam/stations/${station.station_code}/${yyyy}/${mm}/${dd}/${ts}.jpg`;

    const imageBytes = await image.arrayBuffer();
    const mime = image.type || 'image/jpeg';

    // Upload new image first
    const { error: upErr } = await admin.storage.from(BUCKET).upload(imagePath, imageBytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) {
      console.error('skycam upload failed', upErr.message);
      return new Response(JSON.stringify({ success: false, error: 'storage_upload_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Run AI analysis (non-fatal)
    const ai = await analyzeWithGroq(imageBytes, mime);
    const analysis = ai.result;
    const aiChecked = ai.ok;
    const obsStatus = ai.ok ? 'analyzed' : 'ai_failed';
    if (!ai.ok && ai.error) console.error('skycam AI error:', ai.error);

    // Insert observation
    const { data: inserted, error: insertErr } = await admin
      .from('skycam_observations')
      .insert({
        station_id: station.id,
        image_path: imagePath,
        captured_at: capturedAt,
        cloud_cover_percent: analysis.cloud_cover_percent,
        condition_label: analysis.condition_label,
        rain_visible: analysis.rain_visible,
        snow_visible: analysis.snow_visible,
        fog_visible: analysis.fog_visible,
        dark_clouds_visible: analysis.dark_clouds_visible,
        rain_likely_soon: analysis.rain_likely_soon,
        rain_likely_reason: analysis.rain_likely_reason,
        image_quality_score: analysis.image_quality_score,
        ai_confidence: analysis.ai_confidence,
        ai_checked: aiChecked,
        raw_ai_result: { ...(analysis.raw_ai_result as Record<string, unknown> | null ?? {}), firmware_version: firmwareVersion || null, ai_error: ai.error ?? null },
        status: obsStatus,
        source_type: 'station',
        is_latest: true,
      })
      .select('id,uploaded_at')
      .single();

    if (insertErr || !inserted) {
      // Roll back image
      await admin.storage.from(BUCKET).remove([imagePath]);
      console.error('observation insert failed', insertErr?.message);
      return new Response(JSON.stringify({ success: false, error: 'observation_insert_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mark previous observations not latest + collect old image paths to delete
    const { data: oldObs } = await admin
      .from('skycam_observations')
      .select('id,image_path')
      .eq('station_id', station.id)
      .eq('is_latest', true)
      .neq('id', inserted.id);

    if (oldObs && oldObs.length > 0) {
      const oldIds = oldObs.map((o) => o.id);
      await admin.from('skycam_observations')
        .update({ is_latest: false, status: 'replaced' })
        .in('id', oldIds);
      const oldPaths = oldObs.map((o) => o.image_path).filter((p): p is string => !!p && p !== imagePath);
      if (oldPaths.length > 0) {
        const { error: rmErr } = await admin.storage.from(BUCKET).remove(oldPaths);
        if (rmErr) console.error('skycam old image delete failed', rmErr.message);
      }
    }

    // Upsert station latest
    await admin.from('skycam_station_latest').upsert({
      station_id: station.id,
      observation_id: inserted.id,
      image_path: imagePath,
      image_url: null,
      captured_at: capturedAt,
      uploaded_at: inserted.uploaded_at,
      cloud_cover_percent: analysis.cloud_cover_percent,
      condition_label: analysis.condition_label,
      rain_visible: analysis.rain_visible,
      snow_visible: analysis.snow_visible,
      fog_visible: analysis.fog_visible,
      dark_clouds_visible: analysis.dark_clouds_visible,
      rain_likely_soon: analysis.rain_likely_soon,
      rain_likely_reason: analysis.rain_likely_reason,
      image_quality_score: analysis.image_quality_score,
      ai_confidence: analysis.ai_confidence,
      ai_checked: aiChecked,
      raw_ai_result: analysis.raw_ai_result,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'station_id' });

    return new Response(JSON.stringify({
      success: true,
      observation_id: inserted.id,
      image_path: imagePath,
      uploaded_at: inserted.uploaded_at,
      ai_checked: aiChecked,
      condition_label: analysis.condition_label,
      cloud_cover_percent: analysis.cloud_cover_percent,
      rain_likely_soon: analysis.rain_likely_soon,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('upload-skycam-observation error', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ success: false, error: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
