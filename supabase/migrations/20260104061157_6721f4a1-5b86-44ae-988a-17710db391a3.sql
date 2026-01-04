-- Add updated_at column to weather_reports table to fix the trigger error
ALTER TABLE public.weather_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();