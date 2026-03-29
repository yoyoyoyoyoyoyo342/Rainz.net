-- Create app_versions table for version tracking
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  previous_version text,
  changelog text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can read versions
CREATE POLICY "Anyone can view app versions"
  ON public.app_versions FOR SELECT
  TO public
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage app versions"
  ON public.app_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));