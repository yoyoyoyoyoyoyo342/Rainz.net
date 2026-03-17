ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS value text;

INSERT INTO public.feature_flags (key, enabled, value)
VALUES ('app_version', true, '1.2.82')
ON CONFLICT (key) DO UPDATE SET value = '1.2.82';