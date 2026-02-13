-- Drop the FK constraint on weather_predictions.user_id so the Rainz Bot (system account) can submit predictions
-- The bot profile exists in profiles but not in auth.users
ALTER TABLE public.weather_predictions DROP CONSTRAINT IF EXISTS weather_predictions_user_id_fkey;