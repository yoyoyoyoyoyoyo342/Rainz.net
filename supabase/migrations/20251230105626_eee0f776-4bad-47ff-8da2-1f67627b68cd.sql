-- Enable pg_cron for scheduled tasks
create extension if not exists pg_cron;

-- Function to invoke the publish-scheduled-posts edge function using project settings (safe for remixes)
create or replace function public.invoke_publish_scheduled_posts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _resp json;
begin
  select content::json into _resp
  from http((
    'POST',
    current_setting('app.settings.supabase_url') || '/functions/v1/publish-scheduled-posts',
    array[
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'::text
  )::http_request);

  raise notice 'publish-scheduled-posts response: %', _resp;
exception
  when others then
    raise warning 'Error invoking publish-scheduled-posts: %', sqlerrm;
end;
$$;

-- Create/replace cron job (runs every minute)
do $$
begin
  perform cron.unschedule('publish-scheduled-posts-every-minute');
exception
  when others then
    -- ignore if it doesn't exist
    null;
end;
$$;

select
  cron.schedule(
    'publish-scheduled-posts-every-minute',
    '* * * * *',
    $$select public.invoke_publish_scheduled_posts();$$
  );
