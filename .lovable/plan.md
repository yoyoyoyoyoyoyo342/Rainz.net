

# Make Rainz Bot Always Predict + Add Confidence Betting

## Current Problem

The Rainz Bot edge function (`submit-rainz-prediction`) exists but has **no cron job** -- it never runs automatically. The bot also doesn't use the new `confidence_multiplier` column, always defaulting to 1x (Safe).

## The Fix (Two Parts)

### Part 1: Schedule the bot to predict daily

Create a cron job that calls `submit-rainz-prediction` every day at **20:00 UTC** (before the verify job at 21:00 UTC). This ensures the bot always has a prediction in place before verification runs.

### Part 2: Add confidence betting to the bot

Make the bot randomly pick a confidence level for each prediction, giving it personality:

- **Safe (1x)** -- 40% chance
- **Confident (1.5x)** -- 40% chance
- **All-In (2.5x)** -- 20% chance

The bot uses real forecast data from Open-Meteo, so it should be fairly accurate. The random confidence selection adds excitement -- sometimes the bot goes all-in and earns big, sometimes it plays it safe.

Update the insert call to include `confidence_multiplier` in the prediction row.

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `supabase/functions/submit-rainz-prediction/index.ts` | Add random confidence multiplier selection (1, 1.5, or 2.5) and include it in the insert |
| Deploy | `submit-rainz-prediction` | Redeploy edge function |
| Migration | SQL | `cron.schedule` to run `submit-rainz-prediction` daily at `0 20 * * *` (20:00 UTC) |

## Technical Details

### Confidence selection logic

```text
function pickConfidence(): number {
  const roll = Math.random();
  if (roll < 0.4) return 1;      // Safe (40%)
  if (roll < 0.8) return 1.5;    // Confident (40%)
  return 2.5;                     // All-In (20%)
}
```

### Cron schedule

The bot predicts at 20:00 UTC, one hour before verification runs at 21:00 UTC. This ensures the bot's prediction for "today" (which targets tomorrow) is always submitted before any verification cycle.

