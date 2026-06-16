
DROP VIEW IF EXISTS public.public_profiles;

-- Re-create with security_invoker = true so caller RLS applies; safe columns only.
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
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

-- Allow anon + authenticated to read display-name-only rows from profiles via the view
-- by adding a narrow SELECT policy that still gates which rows are visible.
-- We use a policy that allows reading any row but rely on the view to expose
-- only safe columns. (RLS row gate; column scoping via view.)
CREATE POLICY "Public profile fields visible via view"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (display_name IS NOT NULL);
