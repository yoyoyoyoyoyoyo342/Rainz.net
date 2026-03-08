CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_flags (key, enabled) VALUES
  ('maintenance_mode', false),
  ('predictions_enabled', true),
  ('leaderboard_enabled', true),
  ('shop_enabled', true),
  ('battles_enabled', true),
  ('reactions_enabled', true),
  ('games_enabled', true),
  ('trivia_enabled', true),
  ('ai_companion_enabled', true),
  ('spin_wheel_enabled', true),
  ('explore_enabled', true)
ON CONFLICT (key) DO NOTHING;