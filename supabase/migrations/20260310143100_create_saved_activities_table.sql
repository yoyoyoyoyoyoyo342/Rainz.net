-- Create saved_activities table for storing tracked activities
CREATE TABLE saved_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'track' CHECK (activity_type IN ('track', 'walk', 'run', 'ride')),
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('driving', 'cycling', 'walking')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  distance NUMERIC NOT NULL, -- meters
  duration NUMERIC NOT NULL, -- seconds
  avg_pace NUMERIC, -- seconds per km
  gps_points JSONB NOT NULL, -- {lat: number, lng: number, timestamp: number}[]
  calories_estimate NUMERIC,
  co2_estimate NUMERIC,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_saved_activities_user_id ON saved_activities(user_id);
CREATE INDEX idx_saved_activities_started_at ON saved_activities(started_at DESC);
CREATE INDEX idx_saved_activities_is_public ON saved_activities(is_public);

-- Set up RLS (Row Level Security)
ALTER TABLE saved_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities or public activities"
  ON saved_activities FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create activities"
  ON saved_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON saved_activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON saved_activities FOR DELETE
  USING (auth.uid() = user_id);
