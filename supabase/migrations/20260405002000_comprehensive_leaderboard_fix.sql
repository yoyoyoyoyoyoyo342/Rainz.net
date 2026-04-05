-- Comprehensive fix for monthly and trophy leaderboards

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
    row_number() OVER (ORDER BY COALESCE(SUM(wp.points_earned), 0) DESC) AS rank,
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
  LEFT JOIN public.user_streaks us ON us.user_id = p.user_id
  WHERE p.display_name IS NOT NULL
    AND (SELECT month_start FROM recent_month) IS NOT NULL
  GROUP BY p.user_id, p.display_name, us.current_streak, us.longest_streak, p.trophy_count
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

-- Ensure trophy_count is properly synced with monthly_trophies
UPDATE public.profiles p
SET trophy_count = COALESCE(mt.trophy_count, 0)
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
