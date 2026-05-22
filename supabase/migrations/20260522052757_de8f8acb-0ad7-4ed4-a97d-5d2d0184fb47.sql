
-- Drop seed row from old system
DELETE FROM public.skycam_stations WHERE station_code = 'CPH-BISPEBJERG-001' AND upload_key_hash = 'REPLACE_ME_WITH_SHA256_HEX_OF_SECRET_PLUS_PEPPER';

-- Remove old shared upload key column
ALTER TABLE public.skycam_stations DROP COLUMN IF EXISTS upload_key_hash;

-- Add new columns for per-user API key system
ALTER TABLE public.skycam_stations
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS camera_type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS last_upload_at timestamptz;

-- Relax city/country (user might not fill these initially)
ALTER TABLE public.skycam_stations ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.skycam_stations ALTER COLUMN country DROP NOT NULL;

-- Index for fast api key lookup
CREATE UNIQUE INDEX IF NOT EXISTS skycam_stations_api_key_hash_uidx
  ON public.skycam_stations(api_key_hash)
  WHERE api_key_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS skycam_stations_owner_idx
  ON public.skycam_stations(owner_user_id);

-- Camera type validation
ALTER TABLE public.skycam_stations DROP CONSTRAINT IF EXISTS skycam_stations_camera_type_check;
ALTER TABLE public.skycam_stations
  ADD CONSTRAINT skycam_stations_camera_type_check CHECK (camera_type IN ('normal','noir'));

-- New RLS policies for owners
DROP POLICY IF EXISTS "Owners can view their stations" ON public.skycam_stations;
CREATE POLICY "Owners can view their stations"
  ON public.skycam_stations FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owners can update their stations" ON public.skycam_stations;
CREATE POLICY "Owners can update their stations"
  ON public.skycam_stations FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owners can delete their stations" ON public.skycam_stations;
CREATE POLICY "Owners can delete their stations"
  ON public.skycam_stations FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Inserts happen through the register-skycam-station edge function (service role), so no INSERT policy for clients

-- Hide api_key_hash from everyone but service role
REVOKE SELECT (api_key_hash) ON public.skycam_stations FROM anon, authenticated;
