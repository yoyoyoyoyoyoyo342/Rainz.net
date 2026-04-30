-- Add permanent trophy tracking and convert past monthly winners into trophies

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trophy_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.monthly_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_trophies_unique_month UNIQUE (year, month)
);

-- Retroactively award one trophy per month to the player with the most points in that month.
WITH monthly_summary AS (
  SELECT
    date_part('year', prediction_date)::int AS year,
    date_part('month', prediction_date)::int AS month,
    wp.user_id,
    COUNT(*) FILTER (WHERE wp.is_verified = true AND wp.is_correct = true) AS correct_predictions,
    COALESCE(SUM(wp.points_earned) FILTER (WHERE wp.is_verified = true), 0) AS month_points
  FROM public.weather_predictions wp
  GROUP BY 1, 2, 3
),
monthly_winner AS (
  SELECT DISTINCT ON (year, month)
    year,
    month,
    user_id
  FROM monthly_summary
  WHERE month_points > 0
  ORDER BY year, month, month_points DESC, user_id
)
INSERT INTO public.monthly_trophies (year, month, user_id)
SELECT year, month, user_id
FROM monthly_winner
ON CONFLICT (year, month) DO NOTHING;

UPDATE public.profiles p
SET trophy_count = COALESCE(mt.count, 0)
FROM (
  SELECT user_id, COUNT(*) AS count
  FROM public.monthly_trophies
  GROUP BY user_id
) mt
WHERE p.user_id = mt.user_id;

UPDATE public.profiles p
SET trophy_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.monthly_trophies mt
  WHERE mt.user_id = p.user_id
);

-- Replace the all-time leaderboard with a trophy leaderboard.
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  rank bigint,
  display_name text,
  trophy_count bigint,
  total_points bigint,
  current_streak integer,
  longest_streak integer,
  total_predictions bigint,
  correct_predictions bigint,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    row_number() OVER (ORDER BY COALESCE(p.trophy_count, 0) DESC, COALESCE(p.total_points, 0) DESC) AS rank,
    p.display_name,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    COALESCE(p.total_points, 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id), 0::bigint) AS total_predictions,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id AND wp.is_verified = true AND wp.is_correct = true), 0::bigint) AS correct_predictions,
    p.user_id
  FROM public.profiles p
  LEFT JOIN public.user_streaks us ON us.user_id = p.user_id
  WHERE p.display_name IS NOT NULL
  ORDER BY COALESCE(p.trophy_count, 0) DESC, COALESCE(p.total_points, 0) DESC
  LIMIT 10;
$$;

-- Monthly leaderboard should rank by correct predictions, not points.
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
SET search_path = public
AS $$
  SELECT
    row_number() OVER (ORDER BY correct_predictions DESC, total_points DESC) AS rank,
    p.display_name,
    COALESCE(SUM(CASE WHEN wp.is_verified = true THEN wp.points_earned ELSE 0 END), 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE(COUNT(CASE WHEN wp.is_verified = true THEN 1 END), 0)::bigint AS total_predictions,
    COALESCE(COUNT(CASE WHEN wp.is_verified = true AND wp.is_correct = true THEN 1 END), 0)::bigint AS correct_predictions,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    p.user_id
  FROM public.profiles p
  LEFT JOIN public.weather_predictions wp ON wp.user_id = p.user_id
    AND wp.prediction_date >= date_trunc('month', now())
    AND wp.prediction_date < date_trunc('month', now()) + INTERVAL '1 month'
  LEFT JOIN public.user_streaks us ON us.user_id = p.user_id
  WHERE p.display_name IS NOT NULL
  GROUP BY p.user_id, p.display_name, us.current_streak, us.longest_streak, p.trophy_count
  HAVING COALESCE(COUNT(CASE WHEN wp.is_verified = true THEN 1 END), 0) > 0
  ORDER BY correct_predictions DESC, total_points DESC
  LIMIT 10;
$$;

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
    JOIN target t ON date_part('year', prediction_date)::int = t.year
      AND date_part('month', prediction_date)::int = t.month
    GROUP BY 1, 2, 3
  ),
  winner AS (
    SELECT DISTINCT ON (year, month)
      year,
      month,
      user_id
    FROM month_summary
    WHERE month_points > 0
    ORDER BY year, month, month_points DESC, user_id
  )
  INSERT INTO public.monthly_trophies (year, month, user_id)
  SELECT year, month, user_id FROM winner
  ON CONFLICT (year, month) DO NOTHING;
$$;
