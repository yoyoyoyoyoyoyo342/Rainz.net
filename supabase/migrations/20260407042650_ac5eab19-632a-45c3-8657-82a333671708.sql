
-- Remove the incorrectly awarded December 2025 trophy (all users had negative points)
DELETE FROM monthly_trophies WHERE year = 2025 AND month = 12;

-- Resync profiles.trophy_count from monthly_trophies
UPDATE profiles SET trophy_count = (
  SELECT COUNT(*) FROM monthly_trophies mt WHERE mt.user_id = profiles.user_id
);

-- Also update the award_monthly_trophy function to only award if winner had positive points
CREATE OR REPLACE FUNCTION public.award_monthly_trophy(target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_winner_id uuid;
  v_winner_pts bigint;
  v_year integer := EXTRACT(YEAR FROM target_date);
  v_month integer := EXTRACT(MONTH FROM target_date);
BEGIN
  SELECT wp.user_id, SUM(wp.points_earned)
  INTO v_winner_id, v_winner_pts
  FROM weather_predictions wp
  WHERE wp.is_verified = true
    AND wp.prediction_date >= date_trunc('month', target_date)::date
    AND wp.prediction_date < (date_trunc('month', target_date) + interval '1 month')::date
  GROUP BY wp.user_id
  ORDER BY SUM(wp.points_earned) DESC
  LIMIT 1;

  -- Only award if the winner actually had positive points
  IF v_winner_id IS NOT NULL AND v_winner_pts > 0 THEN
    INSERT INTO monthly_trophies (year, month, user_id)
    VALUES (v_year, v_month, v_winner_id)
    ON CONFLICT (year, month) DO NOTHING;
  END IF;
END;
$$;
