-- Add unique constraint on endpoint for push_subscriptions upsert support
-- (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_key'
  ) THEN
    ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

-- Schedule check-weather-alerts to run every 30 minutes
SELECT cron.schedule(
  'check-weather-alerts-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/check-weather-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od3Ria3VkcGtmYmFreW5pa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQxOTMsImV4cCI6MjA3MDEyMDE5M30.ZjOP7yeDgqpFk_caDCF7rUpoE51DV8aqhxuLHDsjJrI"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
