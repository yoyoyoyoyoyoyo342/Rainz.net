// Rejn SkyCam shared types
export type SkyCamConditionLabel =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'snow'
  | 'fog'
  | 'storm'
  | 'unknown';

export interface SkyCamAnalysisResult {
  cloud_cover_percent: number | null;
  condition_label: SkyCamConditionLabel | null;
  rain_visible: boolean | null;
  snow_visible: boolean | null;
  fog_visible: boolean | null;
  dark_clouds_visible: boolean | null;
  rain_likely_soon: boolean | null;
  rain_likely_reason: string | null;
  image_quality_score: number | null;
  ai_confidence: number | null;
  raw_ai_result: unknown | null;
}

export interface SkyCamStation {
  id: string;
  station_code: string;
  name: string;
  city: string;
  area: string | null;
  country: string;
  latitude: number;
  longitude: number;
  camera_direction: string | null;
  coverage_radius_km: number;
  display_for_city: boolean;
  is_active: boolean;
  is_public: boolean;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkyCamObservation {
  id: string;
  station_id: string;
  image_path: string;
  image_url: string | null;
  captured_at: string;
  uploaded_at: string;
  cloud_cover_percent: number | null;
  condition_label: SkyCamConditionLabel | null;
  rain_visible: boolean | null;
  snow_visible: boolean | null;
  fog_visible: boolean | null;
  dark_clouds_visible: boolean | null;
  rain_likely_soon: boolean | null;
  rain_likely_reason: string | null;
  image_quality_score: number | null;
  ai_confidence: number | null;
  ai_checked: boolean;
  raw_ai_result: unknown | null;
  status: string;
  source_type: string;
  is_latest: boolean;
}

export interface SkyCamStationLatest {
  station_id: string;
  observation_id: string | null;
  image_path: string | null;
  image_url: string | null;
  captured_at: string | null;
  uploaded_at: string;
  cloud_cover_percent: number | null;
  condition_label: SkyCamConditionLabel | null;
  rain_visible: boolean | null;
  snow_visible: boolean | null;
  fog_visible: boolean | null;
  dark_clouds_visible: boolean | null;
  rain_likely_soon: boolean | null;
  rain_likely_reason: string | null;
  image_quality_score: number | null;
  ai_confidence: number | null;
  ai_checked: boolean;
  raw_ai_result: unknown | null;
  updated_at: string;
}

export interface SkyCamUserSubmission {
  id: string;
  user_id: string | null;
  image_path: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  area: string | null;
  country: string | null;
  submitted_at: string;
  captured_at: string | null;
  forecast_was_accurate: boolean | null;
  user_condition_label: string | null;
  user_note: string | null;
  cloud_cover_percent: number | null;
  condition_label: SkyCamConditionLabel | null;
  rain_visible: boolean | null;
  snow_visible: boolean | null;
  fog_visible: boolean | null;
  dark_clouds_visible: boolean | null;
  rain_likely_soon: boolean | null;
  rain_likely_reason: string | null;
  image_quality_score: number | null;
  ai_confidence: number | null;
  ai_checked: boolean;
  raw_ai_result: unknown | null;
  status: string;
  is_approved: boolean;
  is_public: boolean;
}

export type SkyCamWeatherSource = 'skycam' | 'api';

export interface SkyCamWeatherSourceDecision {
  source: SkyCamWeatherSource;
  station: SkyCamStation | null;
  latest: SkyCamStationLatest | null;
  distanceKm: number | null;
  reason: string;
}
