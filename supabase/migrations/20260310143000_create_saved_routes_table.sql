-- Create saved_routes table for storing user-created and found routes
CREATE TABLE saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  route_type TEXT NOT NULL CHECK (route_type IN ('found', 'created', 'tracked')),
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('driving', 'cycling', 'walking')),
  start_location TEXT,
  end_location TEXT,
  start_coords JSONB, -- {lat: number, lng: number}
  end_coords JSONB,
  geometry JSONB NOT NULL, -- GeoJSON: {coordinates: [number, number][]}
  distance NUMERIC NOT NULL, -- meters
  duration NUMERIC NOT NULL, -- seconds
  rain_score NUMERIC, -- 0-100
  rain_timeline JSONB, -- {distance: number, rainProb: number}[]
  steps JSONB, -- RouteStep[]
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX idx_saved_routes_created_at ON saved_routes(created_at DESC);
CREATE INDEX idx_saved_routes_is_public ON saved_routes(is_public);

-- Set up RLS (Row Level Security)
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routes or public routes"
  ON saved_routes FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create routes"
  ON saved_routes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes"
  ON saved_routes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes"
  ON saved_routes FOR DELETE
  USING (auth.uid() = user_id);
