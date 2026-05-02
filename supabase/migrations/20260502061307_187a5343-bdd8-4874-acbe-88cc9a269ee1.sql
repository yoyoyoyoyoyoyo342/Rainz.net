-- 1. Refund May 2 points (they were verified prematurely; day isn't done)
WITH refunds AS (
  SELECT user_id, COALESCE(SUM(points_earned),0) AS pts
  FROM public.weather_predictions
  WHERE prediction_date = '2026-05-02' AND is_verified = true
  GROUP BY user_id
)
UPDATE public.profiles p
SET total_points = GREATEST(0, p.total_points - r.pts)
FROM refunds r
WHERE p.user_id = r.user_id;

-- 2. Reset May 2 predictions to unverified (will be re-verified after the day completes)
UPDATE public.weather_predictions
SET is_verified = false,
    is_correct = NULL,
    points_earned = 0,
    actual_high = NULL,
    actual_low = NULL,
    actual_condition = NULL
WHERE prediction_date = '2026-05-02';

-- 3. Re-score May 1 without the 2.5x multiplier (use base points only)
-- Compute new points by dividing existing points_earned by the multiplier they used
WITH adjustments AS (
  SELECT
    id,
    user_id,
    points_earned AS old_pts,
    ROUND(points_earned / NULLIF(confidence_multiplier, 0))::int AS new_pts
  FROM public.weather_predictions
  WHERE prediction_date = '2026-05-01' AND is_verified = true
),
profile_deltas AS (
  SELECT user_id, SUM(new_pts - old_pts) AS delta
  FROM adjustments
  GROUP BY user_id
)
UPDATE public.profiles p
SET total_points = GREATEST(0, p.total_points + d.delta)
FROM profile_deltas d
WHERE p.user_id = d.user_id;

-- Update the predictions themselves (set multiplier to 1 and points to base)
UPDATE public.weather_predictions wp
SET points_earned = ROUND(wp.points_earned / NULLIF(wp.confidence_multiplier, 0))::int,
    confidence_multiplier = 1
WHERE wp.prediction_date = '2026-05-01' AND wp.is_verified = true;