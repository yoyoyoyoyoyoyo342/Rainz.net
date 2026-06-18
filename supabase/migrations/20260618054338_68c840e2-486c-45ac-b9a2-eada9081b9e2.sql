
CREATE TABLE public.app_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  background_color TEXT NOT NULL DEFAULT '#3b82f6',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_banners TO anon, authenticated;
GRANT ALL ON public.app_banners TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.app_banners TO authenticated;

ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners"
  ON public.app_banners
  FOR SELECT
  USING (is_active = true AND now() BETWEEN starts_at AND ends_at);

CREATE POLICY "Admins can read all banners"
  ON public.app_banners
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banners"
  ON public.app_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
  ON public.app_banners
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
  ON public.app_banners
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
