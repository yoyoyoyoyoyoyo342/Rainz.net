
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
  LEFT JOIN user_streaks us ON us.user_id = p.user_id
  WHERE p.display_name IS NOT NULL
  ORDER BY COALESCE(p.trophy_count, 0) DESC, p.total_points DESC, COALESCE(us.current_streak, 0) DESC
  LIMIT 10;
$$;
