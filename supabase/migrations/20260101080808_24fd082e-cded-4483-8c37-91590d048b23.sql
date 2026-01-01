-- Add new columns for expanded analytics tracking
ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for better query performance on event types
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata ON public.analytics_events USING GIN(metadata);

-- Create a view for location search analytics
CREATE OR REPLACE VIEW public.location_search_stats AS
SELECT 
  metadata->>'location_name' as location_name,
  metadata->>'latitude' as latitude,
  metadata->>'longitude' as longitude,
  COUNT(*) as search_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  MAX(created_at) as last_searched
FROM public.analytics_events
WHERE event_type = 'location_search' AND metadata->>'location_name' IS NOT NULL
GROUP BY metadata->>'location_name', metadata->>'latitude', metadata->>'longitude'
ORDER BY search_count DESC;