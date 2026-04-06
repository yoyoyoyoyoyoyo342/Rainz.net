
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(rank bigint, display_name text, total_points integer, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, trophy_count bigint, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    row_number() OVER (ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC) AS rank,
    p.display_name,
    p.total_points,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(us.longest_streak, 0) AS longest_streak,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id), 0::bigint) AS total_predictions,
    COALESCE((SELECT count(*) FROM weather_predictions wp WHERE wp.user_id = p.user_id AND wp.is_verified = true AND wp.is_correct = true), 0::bigint) AS correct_predictions,
    COALESCE(p.trophy_count, 0)::bigint AS trophy_count,
    p.user_id
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT s.current_streak, s.longest_streak
    FROM user_streaks s
    WHERE s.user_id = p.user_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) us ON true
  WHERE p.display_name IS NOT NULL
  ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC
  LIMIT 10;
$$;

-- Also fix monthly leaderboard for same issue
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard();

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
  LEFT JOIN LATERAL (
    SELECT s.current_streak, s.longest_streak
    FROM user_streaks s
    WHERE s.user_id = prof.user_id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) us ON true
  LEFT JOIN weather_predictions wp
    ON wp.user_id = prof.user_id
    AND wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', now())::date
    AND wp.prediction_date < (date_trunc('month', now()) + interval '1 month')::date
  WHERE prof.display_name IS NOT NULL
  GROUP BY prof.user_id, prof.display_name, prof.trophy_count, us.current_streak, us.longest_streak
  HAVING COALESCE(SUM(wp.points_earned), 0) > 0
  ORDER BY total_points DESC, current_streak DESC
  LIMIT 10;
$$;
