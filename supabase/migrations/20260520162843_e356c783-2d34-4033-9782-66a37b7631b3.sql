
-- ============ Tables ============

CREATE TABLE public.skycam_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code text UNIQUE NOT NULL,
  name text NOT NULL,
  city text NOT NULL,
  area text,
  country text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  camera_direction text,
  coverage_radius_km numeric NOT NULL DEFAULT 5,
  display_for_city boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT false,
  owner_name text,
  upload_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.skycam_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.skycam_stations(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  image_url text,
  captured_at timestamptz NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  cloud_cover_percent integer,
  condition_label text,
  rain_visible boolean,
  snow_visible boolean,
  fog_visible boolean,
  dark_clouds_visible boolean,
  rain_likely_soon boolean,
  rain_likely_reason text,
  image_quality_score integer,
  ai_confidence numeric,
  ai_checked boolean NOT NULL DEFAULT false,
  raw_ai_result jsonb,
  status text NOT NULL DEFAULT 'pending',
  source_type text NOT NULL DEFAULT 'station',
  is_latest boolean NOT NULL DEFAULT false
);
CREATE INDEX skycam_obs_station_latest_idx ON public.skycam_observations(station_id, is_latest);
CREATE INDEX skycam_obs_station_captured_idx ON public.skycam_observations(station_id, captured_at DESC);

CREATE TABLE public.skycam_station_latest (
  station_id uuid PRIMARY KEY REFERENCES public.skycam_stations(id) ON DELETE CASCADE,
  observation_id uuid REFERENCES public.skycam_observations(id) ON DELETE SET NULL,
  image_path text,
  image_url text,
  captured_at timestamptz,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  cloud_cover_percent integer,
  condition_label text,
  rain_visible boolean,
  snow_visible boolean,
  fog_visible boolean,
  dark_clouds_visible boolean,
  rain_likely_soon boolean,
  rain_likely_reason text,
  image_quality_score integer,
  ai_confidence numeric,
  ai_checked boolean NOT NULL DEFAULT false,
  raw_ai_result jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.skycam_user_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  image_path text NOT NULL,
  image_url text,
  latitude double precision,
  longitude double precision,
  city text,
  area text,
  country text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz,
  forecast_was_accurate boolean,
  user_condition_label text,
  user_note text,
  cloud_cover_percent integer,
  condition_label text,
  rain_visible boolean,
  snow_visible boolean,
  fog_visible boolean,
  dark_clouds_visible boolean,
  rain_likely_soon boolean,
  rain_likely_reason text,
  image_quality_score integer,
  ai_confidence numeric,
  ai_checked boolean NOT NULL DEFAULT false,
  raw_ai_result jsonb,
  status text NOT NULL DEFAULT 'pending_review',
  is_approved boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false
);
CREATE INDEX skycam_user_subs_user_idx ON public.skycam_user_submissions(user_id, submitted_at DESC);
CREATE INDEX skycam_user_subs_status_idx ON public.skycam_user_submissions(status);

-- Updated_at triggers
CREATE TRIGGER trg_skycam_stations_updated_at
BEFORE UPDATE ON public.skycam_stations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_skycam_station_latest_updated_at
BEFORE UPDATE ON public.skycam_station_latest
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============

ALTER TABLE public.skycam_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skycam_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skycam_station_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skycam_user_submissions ENABLE ROW LEVEL SECURITY;

-- Stations: public can see active public stations (no upload_key_hash exposed via column-level grants below)
CREATE POLICY "Public can view active public stations"
  ON public.skycam_stations FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Admins can manage stations"
  ON public.skycam_stations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Hide upload_key_hash from non-admins via revoking column select for anon/authenticated
REVOKE SELECT (upload_key_hash) ON public.skycam_stations FROM anon, authenticated;

-- Observations
CREATE POLICY "Public can view observations of public stations"
  ON public.skycam_observations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.skycam_stations s
      WHERE s.id = skycam_observations.station_id
        AND s.is_active = true AND s.is_public = true
    )
  );

CREATE POLICY "Admins can manage observations"
  ON public.skycam_observations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Station latest
CREATE POLICY "Public can view latest of public stations"
  ON public.skycam_station_latest FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.skycam_stations s
      WHERE s.id = skycam_station_latest.station_id
        AND s.is_active = true AND s.is_public = true
    )
  );

CREATE POLICY "Admins can manage station latest"
  ON public.skycam_station_latest FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User submissions
CREATE POLICY "Users can create their own submissions"
  ON public.skycam_user_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions"
  ON public.skycam_user_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view approved public submissions"
  ON public.skycam_user_submissions FOR SELECT
  USING (is_approved = true AND is_public = true);

CREATE POLICY "Admins can manage submissions"
  ON public.skycam_user_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('skycam-images', 'skycam-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins can read/manage; signed-in users can upload to their own user-submission prefix
CREATE POLICY "Admins can read skycam images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'skycam-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage skycam images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'skycam-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'skycam-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own skycam submission images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'skycam-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'skycam'
    AND (storage.foldername(name))[2] = 'user-submissions'
  );

-- ============ Seed dev station ============
-- Placeholder upload_key_hash — REPLACE with a real SHA-256 hex of your secret key
-- (see docs/skycam-setup.md for how to generate)
INSERT INTO public.skycam_stations (
  station_code, name, city, area, country,
  latitude, longitude, camera_direction, coverage_radius_km,
  display_for_city, is_active, is_public, upload_key_hash
) VALUES (
  'CPH-BISPEBJERG-001',
  'Bispebjerg SkyCam 001',
  'Copenhagen', 'Bispebjerg', 'Denmark',
  55.706, 12.541, 'unknown', 8,
  true, true, false,
  'REPLACE_ME_WITH_SHA256_HEX_OF_SECRET_PLUS_PEPPER'
)
ON CONFLICT (station_code) DO NOTHING;
