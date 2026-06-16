
-- 1) Profiles: drop the broad authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view display names for leaderboard" ON public.profiles;

-- Add an admin SELECT policy so admin tooling keeps working
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Safe, public-facing view for cross-user reads
CREATE OR REPLACE VIEW public.public_profiles
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

-- 2) Tip jar: remove public read, add owner + admin policies
DROP POLICY IF EXISTS "Anyone can view tips" ON public.tip_jar;

CREATE POLICY "Users can view their own tips"
ON public.tip_jar
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tips"
ON public.tip_jar
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Safe aggregate function for the public Tip Jar widget
CREATE OR REPLACE FUNCTION public.get_tip_jar_stats()
RETURNS TABLE(total_cents bigint, recent_tippers text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_names text[];
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0)::bigint
    INTO v_total
  FROM public.tip_jar
  WHERE status = 'completed';

  SELECT COALESCE(array_agg(display_name), ARRAY[]::text[])
    INTO v_names
  FROM (
    SELECT DISTINCT ON (t.user_id) p.display_name
    FROM public.tip_jar t
    JOIN public.profiles p ON p.user_id = t.user_id
    WHERE t.status = 'completed' AND p.display_name IS NOT NULL
    ORDER BY t.user_id, t.created_at DESC
  ) recent
  LIMIT 5;

  RETURN QUERY SELECT v_total, v_names;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tip_jar_stats() TO anon, authenticated;

-- 3) Track consumed Stripe sessions to prevent shop-points replay
ALTER TABLE public.shop_purchases
  ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
