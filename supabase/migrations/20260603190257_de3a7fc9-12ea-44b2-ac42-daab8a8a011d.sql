
-- Add seen_whatsnew_2 to user_preferences (skip if column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'seen_whatsnew_2'
  ) THEN
    ALTER TABLE public.user_preferences ADD COLUMN seen_whatsnew_2 boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- AI day summary cache
CREATE TABLE IF NOT EXISTS public.weather_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat numeric(8,4) NOT NULL,
  lng numeric(8,4) NOT NULL,
  date date NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lat, lng, date)
);

GRANT SELECT ON public.weather_ai_summaries TO anon;
GRANT SELECT ON public.weather_ai_summaries TO authenticated;
GRANT ALL ON public.weather_ai_summaries TO service_role;

ALTER TABLE public.weather_ai_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read weather summaries" ON public.weather_ai_summaries;
CREATE POLICY "Anyone can read weather summaries"
  ON public.weather_ai_summaries
  FOR SELECT
  USING (true);
