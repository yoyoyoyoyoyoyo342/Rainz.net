
-- New Feature: Add confidence_multiplier column to weather_predictions
ALTER TABLE public.weather_predictions 
ADD COLUMN IF NOT EXISTS confidence_multiplier numeric NOT NULL DEFAULT 1;
