select cron.schedule(
  'submit-rainz-prediction-daily',
  '0 20 * * *',
  $$
  select
    net.http_post(
        url:='https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/submit-rainz-prediction',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od3Ria3VkcGtmYmFreW5pa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQxOTMsImV4cCI6MjA3MDEyMDE5M30.ZjOP7yeDgqpFk_caDCF7rUpoE51DV8aqhxuLHDsjJrI"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);