-- Update trigger so that weather_predictions.updated_at is bumped when points are awarded
-- and simultaneously award points to profiles.  This ensures the monthly leaderboard,
-- which filters on updated_at >= start of month, immediately reflects new points.

CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS TRIGGER AS $$
BEGIN
  -- when a prediction becomes verified, award the associated points
  IF NEW.is_verified = true AND OLD.is_verified = false THEN
    -- bump update timestamp so monthly queries pick it up
    NEW.updated_at = now();

    UPDATE public.profiles
    SET total_points = total_points + COALESCE(NEW.points_earned, 0)
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- drop old trigger if present and recreate as a BEFORE UPDATE trigger
DROP TRIGGER IF EXISTS trigger_update_prediction_points ON public.weather_predictions;

CREATE TRIGGER trigger_update_prediction_points
  BEFORE UPDATE ON public.weather_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prediction_points();
