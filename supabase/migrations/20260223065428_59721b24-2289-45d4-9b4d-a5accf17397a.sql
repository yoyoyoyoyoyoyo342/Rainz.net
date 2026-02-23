
-- Reset all total_points based on actual verified predictions + battle results
UPDATE public.profiles p
SET total_points = GREATEST(0, COALESCE(pred.pts, 0) + COALESCE(battle.pts, 0))
FROM (SELECT user_id, 0 AS placeholder FROM profiles) base
LEFT JOIN (
  SELECT user_id, SUM(COALESCE(points_earned, 0)) AS pts
  FROM public.weather_predictions
  WHERE is_verified = true
  GROUP BY user_id
) pred ON pred.user_id = base.user_id
LEFT JOIN (
  SELECT winner_id AS user_id,
    SUM(CASE WHEN winner_id IS NOT NULL THEN 100 ELSE 0 END) AS pts
  FROM public.prediction_battles
  WHERE status = 'completed' AND winner_id IS NOT NULL
  GROUP BY winner_id
) battle ON battle.user_id = base.user_id
WHERE p.user_id = base.user_id;

-- Also subtract 50 for each battle loss
UPDATE public.profiles p
SET total_points = GREATEST(0, p.total_points - COALESCE(losses.cnt * 50, 0))
FROM (
  SELECT 
    CASE 
      WHEN winner_id = challenger_id THEN opponent_id
      ELSE challenger_id
    END AS loser_id,
    COUNT(*) AS cnt
  FROM public.prediction_battles
  WHERE status = 'completed' AND winner_id IS NOT NULL
  GROUP BY loser_id
) losses
WHERE p.user_id = losses.loser_id;
