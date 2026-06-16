// Rejn SkyCam — shared AI analysis prompt + parser.
// Used by edge functions (upload-skycam-observation, submit-skycam-photo).
// Client-side code should NOT call this directly because GROQ_API_KEY is server-only.

import type { SkyCamAnalysisResult, SkyCamConditionLabel } from '@/types/skycam';

export const SKYCAM_AI_SYSTEM_PROMPT = `You are Rejn SkyCam, an automated weather verification AI.
You receive a single photo of the sky and must analyse what the weather looks like RIGHT NOW.
Return STRICT JSON only. Do not include markdown, prose, or commentary.

Rules:
- Do not claim rain_visible unless rain is actually visible in the image (streaks, wet surfaces clearly from active rain).
- If clouds are dark/heavy and the sky looks like it might rain soon, you MAY set rain_likely_soon=true, but reflect uncertainty in ai_confidence.
- If the image is too dark, blurry, blocked, indoor, pointed at the ground, or not mostly sky: set image_quality_score low (<40) and prefer "unknown" / null values.
- If you cannot judge confidently, return null or "unknown" rather than guessing.
- cloud_cover_percent: integer 0–100.
- condition_label one of: clear, partly_cloudy, cloudy, overcast, rain, snow, fog, storm, unknown.
- ai_confidence: number 0–1.
- image_quality_score: integer 0–100.
- rain_likely_reason: short human sentence (max ~140 chars) or null.`;

export const SKYCAM_AI_USER_PROMPT = `Analyse this sky photo. Return JSON with EXACT keys:
{
  "cloud_cover_percent": number|null,
  "condition_label": "clear"|"partly_cloudy"|"cloudy"|"overcast"|"rain"|"snow"|"fog"|"storm"|"unknown"|null,
  "rain_visible": boolean|null,
  "snow_visible": boolean|null,
  "fog_visible": boolean|null,
  "dark_clouds_visible": boolean|null,
  "rain_likely_soon": boolean|null,
  "rain_likely_reason": string|null,
  "image_quality_score": number|null,
  "ai_confidence": number|null
}
Return JSON only.`;

const VALID_CONDITIONS: ReadonlyArray<SkyCamConditionLabel> = [
  'clear', 'partly_cloudy', 'cloudy', 'overcast',
  'rain', 'snow', 'fog', 'storm', 'unknown',
];

function asNumOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function asBoolOrNull(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function asStrOrNull(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim().slice(0, 240);
  return null;
}

function asConditionOrNull(v: unknown): SkyCamConditionLabel | null {
  if (typeof v !== 'string') return null;
  const lower = v.toLowerCase().trim() as SkyCamConditionLabel;
  return VALID_CONDITIONS.includes(lower) ? lower : null;
}

/**
 * Parse a Groq vision model response into a strict SkyCamAnalysisResult.
 * Returns null for any field that the model could not provide.
 */
export function parseSkyCamAIResponse(rawText: string): SkyCamAnalysisResult {
  let parsed: Record<string, unknown> = {};
  try {
    // Try direct JSON
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    // Fallback: extract first {...} block
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]) as Record<string, unknown>; } catch { parsed = {}; }
    }
  }

  return {
    cloud_cover_percent: asNumOrNull(parsed.cloud_cover_percent),
    condition_label: asConditionOrNull(parsed.condition_label),
    rain_visible: asBoolOrNull(parsed.rain_visible),
    snow_visible: asBoolOrNull(parsed.snow_visible),
    fog_visible: asBoolOrNull(parsed.fog_visible),
    dark_clouds_visible: asBoolOrNull(parsed.dark_clouds_visible),
    rain_likely_soon: asBoolOrNull(parsed.rain_likely_soon),
    rain_likely_reason: asStrOrNull(parsed.rain_likely_reason),
    image_quality_score: asNumOrNull(parsed.image_quality_score),
    ai_confidence: asNumOrNull(parsed.ai_confidence),
    raw_ai_result: parsed,
  };
}

export function emptySkyCamAnalysis(): SkyCamAnalysisResult {
  return {
    cloud_cover_percent: null,
    condition_label: null,
    rain_visible: null,
    snow_visible: null,
    fog_visible: null,
    dark_clouds_visible: null,
    rain_likely_soon: null,
    rain_likely_reason: null,
    image_quality_score: null,
    ai_confidence: null,
    raw_ai_result: null,
  };
}
