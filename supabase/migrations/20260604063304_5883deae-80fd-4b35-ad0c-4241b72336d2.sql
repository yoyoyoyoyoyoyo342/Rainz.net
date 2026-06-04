
INSERT INTO public.analytics_events_daily (day, event_type, page_path, country, event_count, unique_users, unique_sessions)
SELECT created_at::date, COALESCE(event_type,''), COALESCE(page_path,''), COALESCE(country,''),
       count(*)::int, count(DISTINCT user_id)::int, count(DISTINCT session_id)::int
FROM public.analytics_events
WHERE created_at < '2025-12-01'
GROUP BY 1,2,3,4
ON CONFLICT (day,event_type,page_path,country) DO UPDATE
  SET event_count=EXCLUDED.event_count, unique_users=EXCLUDED.unique_users, unique_sessions=EXCLUDED.unique_sessions;

DELETE FROM public.analytics_events WHERE created_at < '2025-12-01';
