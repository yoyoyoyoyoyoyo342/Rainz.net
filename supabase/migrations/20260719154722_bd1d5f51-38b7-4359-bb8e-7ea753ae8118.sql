
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS location_permission TEXT,
  ADD COLUMN IF NOT EXISTS changelog_seen_version TEXT;

UPDATE public.profiles
   SET onboarding_step = 'done'
 WHERE onboarding_step IS NULL;

CREATE TABLE IF NOT EXISTS public.app_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_changelog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_changelog TO authenticated;
GRANT ALL ON public.app_changelog TO service_role;

ALTER TABLE public.app_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published changelog"
  ON public.app_changelog FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert changelog"
  ON public.app_changelog FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update changelog"
  ON public.app_changelog FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete changelog"
  ON public.app_changelog FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_changelog_updated_at
  BEFORE UPDATE ON public.app_changelog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.world_cities (
  id BIGSERIAL PRIMARY KEY,
  geoname_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  ascii_name TEXT,
  country_code TEXT,
  admin1 TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  population BIGINT NOT NULL DEFAULT 0,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_cities_lat_lon ON public.world_cities (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_world_cities_population ON public.world_cities (population DESC);
CREATE INDEX IF NOT EXISTS idx_world_cities_name_trgm ON public.world_cities USING gin (ascii_name gin_trgm_ops);

GRANT SELECT ON public.world_cities TO anon, authenticated;
GRANT ALL ON public.world_cities TO service_role;

ALTER TABLE public.world_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of world_cities"
  ON public.world_cities FOR SELECT
  USING (true);
