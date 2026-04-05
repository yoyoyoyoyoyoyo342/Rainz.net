-- Fix monthly leaderboard to show users with points even without verified predictions this month
-- Also ensure trophy retrieval works correctly

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
  WITH monthly_data AS (
    SELECT
      p.user_id,
      p.display_name,
      COALESCE(SUM(CASE WHEN wp.is_verified = true THEN wp.points_earned ELSE 0 END), 0)::bigint AS month_points,
      COALESCE(COUNT(CASE WHEN wp.is_verified = true THEN 1 END), 0)::bigint AS month_predictions,
      COALESCE(COUNT(CASE WHEN wp.is_verified = true AND wp.is_correct = true THEN 1 END), 0)::bigint AS month_correct,
      COALESCE(us.current_streak, 0) AS current_streak,
      COALESCE(us.longest_streak, 0) AS longest_streak,
      COALESCE(p.trophy_count, 0)::bigint AS trophy_count
    FROM public.profiles p
    LEFT JOIN public.weather_predictions wp ON wp.user_id = p.user_id
      AND wp.prediction_date >= date_trunc('month', now())
      AND wp.prediction_date < date_trunc('month', now()) + INTERVAL '1 month'
    LEFT JOIN public.user_streaks us ON us.user_id = p.user_id
    WHERE p.display_name IS NOT NULL
    GROUP BY p.user_id, p.display_name, us.current_streak, us.longest_streak, p.trophy_count
  )
  SELECT
    row_number() OVER (ORDER BY month_points DESC, month_correct DESC) AS rank,
    display_name,
    month_points AS total_points,
    current_streak,
    longest_streak,
    month_predictions AS total_predictions,
    month_correct AS correct_predictions,
    trophy_count,
    user_id
  FROM monthly_data
  WHERE month_points > 0
  ORDER BY month_points DESC, month_correct DESC
  LIMIT 10;
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

-- Update trophy counts from all retroactively awarded trophies
UPDATE public.profiles p
SET trophy_count = COALESCE(mt.count, 0)
FROM (
  SELECT user_id, COUNT(*) AS count
  FROM public.monthly_trophies
  GROUP BY user_id
) mt
WHERE p.user_id = mt.user_id;
