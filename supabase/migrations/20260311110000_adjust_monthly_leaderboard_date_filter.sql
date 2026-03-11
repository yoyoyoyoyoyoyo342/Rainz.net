-- Update monthly leaderboard function to use prediction_date instead of updated_at
-- and align calculation with all-time leaderboard logic.

CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(
  rank bigint,
  display_name text,
  total_points bigint,
  current_streak integer,
  longest_streak integer,
  total_predictions bigint,
  correct_predictions bigint,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    row_number() OVER (ORDER BY COALESCE(SUM(wp.points_earned), 0) DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    prof.display_name,
    COALESCE(SUM(wp.points_earned), 0)::bigint AS total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COUNT(wp.id)::bigint AS total_predictions,
    COUNT(CASE WHEN wp.is_correct = true THEN 1 END)::bigint AS correct_predictions,
    prof.user_id
  FROM profiles prof
  LEFT JOIN weather_predictions wp 
    ON wp.user_id = prof.user_id 
    AND wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', now())
    AND wp.prediction_date < (date_trunc('month', now()) + INTERVAL '1 month')
  LEFT JOIN user_streaks us ON us.user_id = prof.user_id
  WHERE prof.display_name IS NOT NULL
  GROUP BY prof.user_id, prof.display_name, us.current_streak, us.longest_streak
  HAVING COALESCE(SUM(wp.points_earned), 0) > 0
  ORDER BY total_points DESC, current_streak DESC
  LIMIT 10;
$$;
