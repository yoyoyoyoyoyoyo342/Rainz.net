

# Fix: Prediction Points Stuck at 0 + New Confidence Betting Feature

## Problem Analysis

Two bugs are preventing users from receiving points:

### Bug 1: Cron Schedule Mismatch (Primary -- causes 0 points)
- The cron job fires at `0 1 * * *` (1:00 AM UTC = 2:00 AM CET)
- The edge function only allows execution between CET hours 21-23
- Result: the function rejects every automated call, predictions are NEVER verified, points stay at 0
- Evidence: No verify-predictions logs exist; dozens of unverified predictions from Feb 14-22

### Bug 2: Fahrenheit/Celsius Mismatch (Secondary -- causes wrong scoring)
- When verification DID run (Dec 2025, likely manually forced), actual temperatures were stored in Fahrenheit (e.g., actual_high=38.2) while predictions are in Celsius (predicted_high=3)
- The comparison `|3 - 38.2| = 35.2 > 3` always fails
- Users only ever got points from condition matches (100 or -100), never from temperature accuracy
- This means no one can ever score 200 or 300 points

---

## Fix 1: Cron Schedule

Update the cron job from `0 1 * * *` to `0 21 * * *` (21:00 UTC = 22:00 CET winter / 23:00 CEST summer), which falls within the edge function's allowed window.

**Method:** Run a SQL migration to update `cron.job` schedule.

---

## Fix 2: Edge Function Temperature Verification

In `supabase/functions/verify-predictions/index.ts`:

- Add a sanity check after fetching from Open-Meteo: if the actual values seem to be in Fahrenheit (e.g., the delta between predicted and actual is suspiciously large), log a warning
- More importantly, remove the `Math.round` that rounds actual values (the DB column is numeric and can store decimals, making comparisons more fair)
- Add logging to confirm the API is returning Celsius
- Store the raw Celsius values properly

---

## Fix 3: Backfill Unverified Predictions

Update the edge function to also verify PAST unverified predictions (not just today's):

- When running, also query for any `is_verified = false` predictions where `prediction_date < today`
- Fetch historical weather data from Open-Meteo for those dates (it supports past dates)
- Verify and award points retroactively

This ensures the dozens of missed predictions from Feb 14-22 get scored.

---

## Fix 4: Double-Counting Points (Trigger + Edge Function)

There is a database trigger `update_prediction_points` that adds `points_earned` to `total_points` when `is_verified` changes to true. The edge function ALSO manually updates `total_points`. This causes double-counting.

**Fix:** Remove the manual profile update from the edge function and rely solely on the trigger.

---

## New Feature: Confidence Betting

Add a strategic layer to predictions where users choose a confidence multiplier before submitting.

### How it works:
- When making a prediction, users pick a confidence level: **Safe (1x)**, **Confident (1.5x)**, or **All-In (2.5x)**
- The multiplier applies to BOTH rewards and penalties
- Example with "All-In (2.5x)": 3 correct = +750 points, all wrong = -250 points
- Stored as `confidence_multiplier` in the `weather_predictions` table
- The verify function applies the multiplier during scoring

### Point table with confidence:

```text
                Safe (1x)    Confident (1.5x)    All-In (2.5x)
3 correct       +300         +450                 +750
2 correct       +200         +300                 +500
1 correct       +100         +150                 +250
0 correct       -100         -150                 -250
```

### UI:
- Three tappable cards in the prediction form (before the submit button)
- Each shows the risk/reward clearly
- Default is "Safe (1x)"
- Visual flair: Safe = green/calm, Confident = orange/warm, All-In = red/fire with animation

---

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Migration | SQL | Fix cron schedule to `0 21 * * *`; add `confidence_multiplier` column to `weather_predictions` |
| Edit | `supabase/functions/verify-predictions/index.ts` | Fix backfill logic, remove manual profile update (rely on trigger), apply confidence multiplier, add temperature sanity logging |
| Deploy | `verify-predictions` | Redeploy edge function |
| Edit | `src/components/weather/weather-prediction-form.tsx` | Add confidence level selector UI, store multiplier with prediction |
| Edit | `src/components/weather/prediction-dialog.tsx` | Update "How Points Work" section to mention confidence multiplier |

