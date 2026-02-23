
# Fix: Inflated Points from Double-Counting

## What Happened

The old `verify-predictions` edge function had TWO ways of adding points:
1. A database trigger (`update_prediction_points`) that automatically adds `points_earned` to `total_points` whenever a prediction becomes verified
2. Manual `UPDATE profiles SET total_points = ...` calls in the edge function itself

When the backfill ran, the trigger fired for every prediction being verified, but the old code had already added points manually in previous runs. This resulted in points being counted 2-3x, giving users massively inflated totals.

## The Fix

### Step 1: Reset all `total_points` to the correct calculated values

Run a single SQL migration that recalculates every user's `total_points` from scratch:
- Sum of `points_earned` from all verified predictions
- Plus battle win bonuses (+100 each)
- Minus battle loss penalties (-50 each)
- Floor at 0 (no negative totals)

### Correct values after reset:

```text
User            Current    Correct
Karen           19,395     8,100
Seje_ged        13,570     4,700
gerda            1,325         0
SOH 6400           800         0
Rainz Bot          200       100
Meloniii            75         0
```

### Step 2: No code changes needed

The edge function was already fixed in the previous update -- it no longer manually updates `total_points` (relies solely on the trigger). This migration just corrects the historical damage.

## Technical Details

A single SQL migration will:
1. Recalculate correct points for every profile using verified predictions + battle results
2. Update all profiles in one atomic operation
3. Ensure no profile goes below 0 points
