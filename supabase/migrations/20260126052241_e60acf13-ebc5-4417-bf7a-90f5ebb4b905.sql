-- Add powerup_flags column to weather_predictions to store which powerups were active when prediction was made
ALTER TABLE weather_predictions 
ADD COLUMN powerup_flags JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN weather_predictions.powerup_flags IS 'Stores flags for powerups active at prediction time: {"double_points": true, "prediction_shield": true}';
