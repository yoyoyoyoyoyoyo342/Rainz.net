CREATE TABLE public.city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  city_name text NOT NULL,
  country text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.city_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read city pages" ON public.city_pages FOR SELECT TO public USING (true);
CREATE POLICY "Service can insert city pages" ON public.city_pages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can update city pages" ON public.city_pages FOR UPDATE TO public USING (true);