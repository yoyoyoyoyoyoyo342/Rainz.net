
DROP POLICY IF EXISTS "Public profile fields visible via view" ON public.profiles;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  total_points,
  trophy_count,
  created_at
FROM public.profiles
WHERE display_name IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
