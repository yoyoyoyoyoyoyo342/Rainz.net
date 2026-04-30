-- Comprehensive fix for monthly and trophy leaderboards
-- This migration:
-- 1. Rewrites get_monthly_leaderboard to show most recent month with predictions
-- 2. Runs award_monthly_trophy for all historical months 
-- 3. Syncs trophy_count in profiles with monthly_trophies

-- First, ensure award_monthly_trophy function exists (in case this is the first deploy)
DROP FUNCTION IF EXISTS public.award_monthly_trophy(date);

CREATE FUNCTION public.award_monthly_trophy(target_month date DEFAULT current_date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH target AS (
    SELECT date_part('year', date_trunc('month', target_month))::int AS year,
           date_part('month', date_trunc('month', target_month))::int AS month
  ),
  month_summary AS (
    SELECT
      date_part('year', prediction_date)::int AS year,
      date_part('month', prediction_date)::int AS month,
      wp.user_id,
      COUNT(*) FILTER (WHERE wp.is_verified = true AND wp.is_correct = true) AS correct_predictions,
      COALESCE(SUM(wp.points_earned) FILTER (WHERE wp.is_verified = true), 0) AS month_points
    FROM public.weather_predictions wp
    GROUP BY 1, 2, 3
  ),
  month_winner AS (
    SELECT DISTINCT ON (year, month)
      year,
      month,
      user_id,
      month_points
    FROM month_summary
    WHERE year = (SELECT year FROM target)
      AND month = (SELECT month FROM target)
    ORDER BY year, month, month_points DESC, user_id
  )
  INSERT INTO public.monthly_trophies (year, month, user_id)
  SELECT year, month, user_id FROM month_winner
  ON CONFLICT (year, month) DO NOTHING;
$$;

-- Rewrite monthly leaderboard to show most recent month with data
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(
  rank bigint,
  display_name text,
  total_points bigint,
  current_streak integer,
  longest_streak integer,
  total_predictions bigint,
  correct_predictions bigint,
  trophy_count bigint,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH recent_month AS (
    SELECT 
      date_trunc('month', MAX(prediction_date))::date AS month_start
    FROM public.weather_predictions
    WHERE is_verified = true
  )
  SELECT
    row_number() OVER (ORDER BY COALESCE(SUM(wp.points_earned), 0) DESC, COALESCE(COUNT(wp.id), 0) DESC) AS rank,
    p.display_name,
    COALESCE(SUM(CASE WHEN wp.is_verified = true THEN wp.points_earned ELSE 0 END), 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COUNT(CASE WHEN wp.is_verified = true THEN 1 END)::bigint AS total_predictions,
    COUNT(CASE WHEN wp.is_verified = true AND wp.is_correct = true THEN 1 END)::bigint AS correct_predictions,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    p.user_id
  FROM public.profiles p
  LEFT JOIN recent_month rm ON true
  LEFT JOIN public.weather_predictions wp ON wp.user_id = p.user_id
    AND wp.prediction_date >= rm.month_start
    AND wp.prediction_date < rm.month_start + INTERVAL '1 month'
    AND wp.is_verified = true
  LEFT JOIN public.user_streaks us ON us.user_id = p.user_id
  WHERE p.display_name IS NOT NULL
    AND (SELECT month_start FROM recent_month) IS NOT NULL
  GROUP BY p.user_id, p.display_name, us.current_streak, us.longest_streak, p.trophy_count
  HAVING COUNT(CASE WHEN wp.is_verified = true THEN 1 END) > 0
  ORDER BY total_points DESC
  LIMIT 25;
$$;

-- Award trophies for all complete months since Rainz launch (August 8, 2025)
SELECT public.award_monthly_trophy('2025-08-01'::date);
SELECT public.award_monthly_trophy('2025-09-01'::date);
SELECT public.award_monthly_trophy('2025-10-01'::date);
SELECT public.award_monthly_trophy('2025-11-01'::date);
SELECT public.award_monthly_trophy('2025-12-01'::date);
SELECT public.award_monthly_trophy('2026-01-01'::date);
SELECT public.award_monthly_trophy('2026-02-01'::date);
SELECT public.award_monthly_trophy('2026-03-01'::date);

-- Sync trophy_count: Update users with trophies
UPDATE public.profiles p
SET trophy_count = mt.trophy_count
FROM (
  SELECT user_id, COUNT(*)::integer AS trophy_count
  FROM public.monthly_trophies
  GROUP BY user_id
) mt
WHERE p.user_id = mt.user_id;

-- Ensure users with no trophies have count = 0
UPDATE public.profiles
SET trophy_count = 0
WHERE trophy_count IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.monthly_trophies WHERE user_id = profiles.user_id);
