
GRANT SELECT ON public.analytics_events_daily TO authenticated;
GRANT ALL ON public.analytics_events_daily TO service_role;
ALTER TABLE public.analytics_events_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view analytics rollup" ON public.analytics_events_daily;
CREATE POLICY "Admins can view analytics rollup"
  ON public.analytics_events_daily FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.prune_analytics_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events_daily (day, event_type, page_path, country, event_count, unique_users, unique_sessions)
  SELECT
    created_at::date,
    COALESCE(event_type, ''),
    COALESCE(page_path, ''),
    COALESCE(country, ''),
    count(*)::int,
    count(DISTINCT user_id)::int,
    count(DISTINCT session_id)::int
  FROM public.analytics_events
  WHERE created_at < now() - interval '30 days'
  GROUP BY 1, 2, 3, 4
  ON CONFLICT (day, event_type, page_path, country) DO UPDATE
    SET event_count = EXCLUDED.event_count,
        unique_users = EXCLUDED.unique_users,
        unique_sessions = EXCLUDED.unique_sessions;

  DELETE FROM public.analytics_events WHERE created_at < now() - interval '30 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_analytics_events() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('prune-analytics-events');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'prune-analytics-events',
  '0 3 * * *',
  $$SELECT public.prune_analytics_events();$$
);
