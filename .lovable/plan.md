

# Fix: Prediction Points Stuck at 0 (Cron + Time Guard)

## Root Cause

The cron job fires at **1:00 AM UTC** (2:00 AM CET), but the edge function rejects any call outside **21:00-23:00 CET**. Every automated run gets rejected, so predictions are never verified and users always get 0 points.

You tried updating `cron.job` directly via the SQL Editor, but Supabase doesn't allow direct `UPDATE` on that table. You need to use `cron.unschedule()` + `cron.schedule()` instead.

## The Fix (Two-Part)

### Part 1: Remove the time-of-day guard from the edge function

The CET hour check (lines 83-89 in `verify-predictions/index.ts`) is unnecessary -- the cron job already controls when it runs. Removing this guard means the function will succeed whenever it's called, whether by cron or manually.

### Part 2: Reschedule the cron job via migration

Use `cron.unschedule('verify-predictions-daily')` to remove the old job, then `cron.schedule()` to create a new one at `0 21 * * *` (21:00 UTC). This gives Open-Meteo enough time to have the day's data available.

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `supabase/functions/verify-predictions/index.ts` | Remove the CET hour 21-23 guard (lines 83-89), always run when called |
| Deploy | `verify-predictions` | Redeploy edge function |
| Migration | SQL | `cron.unschedule('verify-predictions-daily')` then `cron.schedule(...)` at `0 21 * * *` |

## Technical Details

The migration SQL will be:

```text
SELECT cron.unschedule('verify-predictions-daily');

SELECT cron.schedule(
  'verify-predictions-daily',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url:='https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/verify-predictions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb
  ) as request_id;
  $$
);
```

The edge function change simply removes the `if (!forceRun && cetHour !== 22 ...)` block so any call triggers verification.

