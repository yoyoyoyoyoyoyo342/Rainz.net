// Rainz SkyCam — user-submitted phone photo endpoint.
// Authenticated user uploads a sky photo. Runs Groq AI analysis. Stays pending_review by default.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'skycam-images';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT = `You are Rainz SkyCam, an automated weather verification AI. Analyse a sky photo. Return STRICT JSON only.
- Do not claim rain_visible unless actually visible.
- If clouds are dark/heavy you may set rain_likely_soon true with lower confidence.
- If image is bad (dark, blurry, indoor, ground), set image_quality_score low and prefer unknown/null.`;
const USER_PROMPT = `Return JSON with EXACT keys: cloud_cover_percent(number|null), condition_label("clear"|"partly_cloudy"|"cloudy"|"overcast"|"rain"|"snow"|"fog"|"storm"|"unknown"|null), rain_visible(bool|null), snow_visible(bool|null), fog_visible(bool|null), dark_clouds_visible(bool|null), rain_likely_soon(bool|null), rain_likely_reason(string|null), image_quality_score(number|null), ai_confidence(number|null). JSON only.`;

const VALID_CONDITIONS = new Set(['clear','partly_cloudy','cloudy','overcast','rain','snow','fog','storm','unknown']);

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
function str(v: unknown): string | null { return typeof v === 'string' && v.trim() ? v.trim().slice(0, 240) : null; }
function cond(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const lower = v.toLowerCase().trim();
  return VALID_CONDITIONS.has(lower) ? lower : null;
}

async function bufToB64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return btoa(bin);
}

async function analyzeWithGroq(imageBytes: ArrayBuffer, mime: string) {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return { ok: false, result: emptyResult(), error: 'no_api_key' };
  try {
    const dataUrl = `data:${mime};base64,${await bufToB64(imageBytes)}`;
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL, temperature: 0.1, max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ] },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, result: emptyResult(), error: `groq_${resp.status}: ${t.slice(0,200)}` };
    }
    const json = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '';
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    return { ok: true, result: {
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
    }};
  } catch (e) {
    return { ok: false, result: emptyResult(), error: e instanceof Error ? e.message : 'ai_err' };
  }
}

function emptyResult() {
  return {
    cloud_cover_percent: null, condition_label: null, rain_visible: null,
    snow_visible: null, fog_visible: null, dark_clouds_visible: null,
    rain_likely_soon: null, rain_likely_reason: null,
    image_quality_score: null, ai_confidence: null, raw_ai_result: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // JWT verification (verify_jwt = false in config; we check in code)
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const form = await req.formData();
    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) {
      return new Response(JSON.stringify({ success: false, error: 'missing_image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (image.size > 15 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'image_too_large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lat = num(form.get('latitude'));
    const lon = num(form.get('longitude'));
    const city = str(form.get('city'));
    const area = str(form.get('area'));
    const country = str(form.get('country'));
    const capturedAtRaw = String(form.get('captured_at') ?? '');
    const capturedAt = capturedAtRaw && !Number.isNaN(Date.parse(capturedAtRaw))
      ? new Date(capturedAtRaw).toISOString() : null;
    const forecastWasAccurate = bool(form.get('forecast_was_accurate'));
    const userCondition = str(form.get('user_condition_label'));
    const userNote = str(form.get('user_note'));

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const submissionId = crypto.randomUUID();
    const imagePath = `skycam/user-submissions/${yyyy}/${mm}/${dd}/${submissionId}.jpg`;

    const imageBytes = await image.arrayBuffer();
    const mime = image.type || 'image/jpeg';

    const { error: upErr } = await admin.storage.from(BUCKET).upload(imagePath, imageBytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) {
      console.error('user submission upload failed', upErr.message);
      return new Response(JSON.stringify({ success: false, error: 'storage_upload_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ai = await analyzeWithGroq(imageBytes, mime);
    const a = ai.result;
    const aiChecked = ai.ok;
    if (!ai.ok && ai.error) console.error('skycam submission AI:', ai.error);

    const { data: inserted, error: insertErr } = await admin
      .from('skycam_user_submissions')
      .insert({
        id: submissionId,
        user_id: userId,
        image_path: imagePath,
        latitude: lat, longitude: lon,
        city, area, country,
        captured_at: capturedAt,
        forecast_was_accurate: forecastWasAccurate,
        user_condition_label: userCondition,
        user_note: userNote,
        cloud_cover_percent: a.cloud_cover_percent,
        condition_label: a.condition_label,
        rain_visible: a.rain_visible,
        snow_visible: a.snow_visible,
        fog_visible: a.fog_visible,
        dark_clouds_visible: a.dark_clouds_visible,
        rain_likely_soon: a.rain_likely_soon,
        rain_likely_reason: a.rain_likely_reason,
        image_quality_score: a.image_quality_score,
        ai_confidence: a.ai_confidence,
        ai_checked: aiChecked,
        raw_ai_result: { ...(a.raw_ai_result as Record<string, unknown> | null ?? {}), ai_error: ai.error ?? null },
        status: ai.ok ? 'pending_review' : 'ai_failed',
        is_approved: false,
        is_public: false,
      })
      .select('id,submitted_at')
      .single();

    if (insertErr || !inserted) {
      await admin.storage.from(BUCKET).remove([imagePath]);
      return new Response(JSON.stringify({ success: false, error: 'submission_insert_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      submission_id: inserted.id,
      image_path: imagePath,
      submitted_at: inserted.submitted_at,
      ai_checked: aiChecked,
      condition_label: a.condition_label,
      rain_likely_soon: a.rain_likely_soon,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('submit-skycam-photo error', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ success: false, error: 'server_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
