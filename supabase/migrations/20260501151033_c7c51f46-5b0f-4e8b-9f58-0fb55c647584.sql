-- Fix: award trophy_count when monthly_trophies row inserted, backfill counts,
-- award Seje_ged one extra trophy, and schedule monthly trophy awarding cron.

-- 1) Trigger to keep profiles.trophy_count in sync with monthly_trophies
CREATE OR REPLACE FUNCTION public.sync_trophy_count_on_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET trophy_count = COALESCE(trophy_count, 0) + 1
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET trophy_count = GREATEST(0, COALESCE(trophy_count, 0) - 1)
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trophy_count ON public.monthly_trophies;
CREATE TRIGGER trg_sync_trophy_count
AFTER INSERT OR DELETE ON public.monthly_trophies
FOR EACH ROW EXECUTE FUNCTION public.sync_trophy_count_on_award();

-- 2) Backfill trophy_count from monthly_trophies for everyone
UPDATE public.profiles p
SET trophy_count = COALESCE(t.cnt, 0)
FROM (
  SELECT user_id, COUNT(*)::int AS cnt
  FROM public.monthly_trophies
  GROUP BY user_id
) t
WHERE p.user_id = t.user_id;

-- 3) Award Seje_ged one extra trophy (non-conflicting placeholder year/month)
INSERT INTO public.monthly_trophies (year, month, user_id)
VALUES (2025, 10, '7ac7d2c8-684e-4122-90e8-742b1a0e427e')
ON CONFLICT (year, month) DO NOTHING;

-- 4) Schedule monthly trophy award job (1st of month at 00:05 UTC, awards previous month)
SELECT cron.unschedule('award-monthly-trophy') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'award-monthly-trophy'
);

SELECT cron.schedule(
  'award-monthly-trophy',
  '5 0 1 * *',
  $$SELECT public.award_monthly_trophy((date_trunc('month', now()) - interval '1 day')::date);$$
);