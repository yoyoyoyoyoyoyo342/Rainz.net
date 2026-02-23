
SELECT cron.unschedule('verify-predictions-daily');

SELECT cron.schedule(
  'verify-predictions-daily',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url:='https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/verify-predictions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od3Ria3VkcGtmYmFreW5pa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQxOTMsImV4cCI6MjA3MDEyMDE5M30.ZjOP7yeDgqpFk_caDCF7rUpoE51DV8aqhxuLHDsjJrI"}'::jsonb
  ) as request_id;
  $$
);
