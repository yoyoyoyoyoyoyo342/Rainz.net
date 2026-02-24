
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS TABLE(rank bigint, display_name text, total_points integer, current_streak integer, longest_streak integer, total_predictions bigint, correct_predictions bigint, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    row_number() OVER (ORDER BY p.total_points DESC, us.current_streak DESC) AS rank,
    prof.display_name,
    p.total_points,
    us.current_streak,
    us.longest_streak,
    COALESCE((
      SELECT count(*) 
      FROM weather_predictions wp
      WHERE wp.user_id = p.user_id
    ), 0::bigint) AS total_predictions,
    COALESCE((
      SELECT count(*) 
      FROM weather_predictions wp
      WHERE wp.user_id = p.user_id AND wp.is_verified = true AND wp.is_correct = true
    ), 0::bigint) AS correct_predictions,
    p.user_id
  FROM profiles p
  LEFT JOIN user_streaks us ON us.user_id = p.user_id
  LEFT JOIN profiles prof ON prof.user_id = p.user_id
  WHERE prof.display_name IS NOT NULL
  ORDER BY p.total_points DESC, us.current_streak DESC
  LIMIT 10;
$function$;
