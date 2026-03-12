# Plan: Fix DryRoutes Map Overlay & Monthly Leaderboard

## Bug 1: Map covering the Save/Confirm Route modals

**Root cause**: The confirmation and save modals are rendered *inside* the fullscreen container (`z-[2000]`). Even though they have `z-[3000]`, that z-index only applies within the stacking context created by the parent `z-[2000]` container. The Leaflet map tiles set their own internal z-index values that can compete within the same stacking context.

**Fix**: Render the three modal overlays (draw confirmation, save route, save activity) via `createPortal(modal, document.body)` so they escape the fullscreen container entirely and sit at z-[3000] on the global stacking context.

In `dry-route.tsx`:

- Import `createPortal` from `react-dom` (already used for fullscreen)
- Wrap each of the three `fixed inset-0 z-[3000]` modal divs in `createPortal(..., document.body)` calls
- This applies to: `showDrawConfirmation`, `showSaveRouteModal`, and `showSaveActivityModal` modals

## Bug 2: Monthly leaderboard accuracy & points wrong

**Root cause**: The monthly leaderboard query filters on `updated_at >= monthStart`. The `update_prediction_points` trigger sets `updated_at = now()` when a prediction becomes verified. But predictions might have been created this month and verified with a different `updated_at`, or the `updated_at` column might be updated by other operations too. Additionally, if no verified predictions exist yet for the current month, the query returns empty results. Also fix streak points not being awarded to the monthly leaderboard.

**Fix**: Change the monthly filter to use `created_at` instead of `updated_at` for consistency. The `created_at` column reliably reflects when the prediction was made, which is what matters for a "monthly" leaderboard. Also show **all-time accuracy** on the monthly tab (same as all-time tab) so accuracy matches between tabs, since monthly accuracy from a small sample can look misleading.

In `leaderboard.tsx`:

- Change all three `.gte("updated_at", monthStart)` calls in `fetchMonthlyLeaderboard` to `.gte("created_at", monthStart)`
- For accuracy display, fetch all-time `totalPredictions` and `correctPredictions` (without the date filter) separately, and use those for the accuracy percentage on both tabs
- Keep monthly `total_points` summed from the date-filtered query for ranking

## Files to modify


| File                                     | Change                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/components/weather/dry-route.tsx`   | Wrap 3 modal overlays in `createPortal(..., document.body)`                                  |
| `src/components/weather/leaderboard.tsx` | Switch monthly filter from `updated_at` to `created_at`, show all-time accuracy on both tabs |
