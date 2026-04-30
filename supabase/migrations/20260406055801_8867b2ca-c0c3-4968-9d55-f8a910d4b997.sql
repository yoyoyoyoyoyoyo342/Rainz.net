
-- 1. Add trophy_count to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trophy_count integer NOT NULL DEFAULT 0;

-- 2. Create monthly_trophies table
CREATE TABLE IF NOT EXISTS public.monthly_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  user_id uuid NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
ALTER TABLE public.monthly_trophies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view monthly trophies" ON public.monthly_trophies FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage monthly trophies" ON public.monthly_trophies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Drop ALL overloads
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard(integer);
DROP FUNCTION IF EXISTS public.get_leaderboard();

-- 4. Recreate get_monthly_leaderboard
CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(rank bigint, display_name text, total_points bigint, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, trophy_count bigint, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    row_number() OVER (ORDER BY COALESCE(SUM(wp.points_earned), 0) DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    prof.display_name,
    COALESCE(SUM(wp.points_earned), 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COUNT(wp.id)::bigint AS total_predictions,
    COUNT(CASE WHEN wp.is_correct = true THEN 1 END)::bigint AS correct_predictions,
    COALESCE(prof.trophy_count, 0)::bigint AS trophy_count,
    prof.user_id
  FROM profiles prof
  LEFT JOIN weather_predictions wp
    ON wp.user_id = prof.user_id
    AND wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', now())::date
    AND wp.prediction_date < (date_trunc('month', now()) + interval '1 month')::date
  LEFT JOIN user_streaks us ON us.user_id = prof.user_id
  WHERE prof.display_name IS NOT NULL
  GROUP BY prof.user_id, prof.display_name, prof.trophy_count, us.current_streak, us.longest_streak
  HAVING COALESCE(SUM(wp.points_earned), 0) > 0
  ORDER BY total_points DESC, current_streak DESC
  LIMIT 10;
$$;

-- 5. Recreate get_leaderboard (trophy board)
CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(rank bigint, display_name text, total_points integer, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, trophy_count bigint, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    row_number() OVER (ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    prof.display_name,
    p.total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id), 0::bigint) AS total_predictions,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id AND wp.is_verified = true AND wp.is_correct = true), 0::bigint) AS correct_predictions,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    p.user_id
  FROM profiles p
  LEFT JOIN user_streaks us ON us.user_id = p.user_id
  LEFT JOIN profiles prof ON prof.user_id = p.user_id
  WHERE prof.display_name IS NOT NULL
  ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC
  LIMIT 10;
$$;

-- 6. Create award_monthly_trophy function
CREATE OR REPLACE FUNCTION public.award_monthly_trophy(target_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_winner_id uuid;
  v_year integer := EXTRACT(YEAR FROM target_date);
  v_month integer := EXTRACT(MONTH FROM target_date);
BEGIN
  SELECT wp.user_id INTO v_winner_id
  FROM weather_predictions wp
  WHERE wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', target_date)::date
    AND wp.prediction_date < (date_trunc('month', target_date) + interval '1 month')::date
  GROUP BY wp.user_id
  ORDER BY SUM(wp.points_earned) DESC
  LIMIT 1;
  IF v_winner_id IS NOT NULL THEN
    INSERT INTO monthly_trophies (year, month, user_id) VALUES (v_year, v_month, v_winner_id) ON CONFLICT (year, month) DO NOTHING;
  END IF;
END;
$$;

-- 7. Backfill trophies
SELECT public.award_monthly_trophy('2025-08-01'::date);
SELECT public.award_monthly_trophy('2025-09-01'::date);
SELECT public.award_monthly_trophy('2025-10-01'::date);
SELECT public.award_monthly_trophy('2025-11-01'::date);
SELECT public.award_monthly_trophy('2025-12-01'::date);
SELECT public.award_monthly_trophy('2026-01-01'::date);
SELECT public.award_monthly_trophy('2026-02-01'::date);
SELECT public.award_monthly_trophy('2026-03-01'::date);

-- 8. Sync profiles.trophy_count
UPDATE profiles p
SET trophy_count = COALESCE(sub.cnt, 0)
FROM (SELECT user_id, COUNT(*)::integer AS cnt FROM monthly_trophies GROUP BY user_id) sub
WHERE p.user_id = sub.user_id;
