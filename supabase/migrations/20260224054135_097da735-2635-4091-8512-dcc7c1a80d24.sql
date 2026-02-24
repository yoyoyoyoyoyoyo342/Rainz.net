
-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule weekly recap every Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-recap-monday',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url:='https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/weekly-recap',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od3Ria3VkcGtmYmFreW5pa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQxOTMsImV4cCI6MjA3MDEyMDE5M30.ZjOP7yeDgqpFk_caDCF7rUpoE51DV8aqhxuLHDsjJrI"}'::jsonb,
    body:='{"time": "weekly"}'::jsonb
  ) AS request_id;
  $$
);
