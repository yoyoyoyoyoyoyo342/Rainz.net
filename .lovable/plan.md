

# Revised Plan: Rainz Bot Nerf + Admin Version Counter

## 1. Rainz Bot Rework

The bot keeps using **exact forecast data** (no deliberate inaccuracies). The only change is removing the confidence multiplier gamble.

**Change in `supabase/functions/submit-rainz-prediction/index.ts`**:
- Remove the `pickConfidence()` function entirely
- Hardcode `confidence_multiplier: 1` (Safe bet only)
- Temperature and condition remain exactly what the forecast API returns

This means the bot can still be accurate, but it never gets the 1.5x or 2.5x point multiplier that human players can risk. Humans who take risks and win will outpace the bot on the leaderboard.

## 2. Admin Version Counter

Add a version editor widget inside the existing admin panel. Store the version string in the `feature_flags` table using a new `value` text column.

**DB migration**: Add `value text` column to `feature_flags` table. Insert an `app_version` row with value `1.2.82`.

**`src/hooks/use-feature-flags.tsx`**: Extend the hook to also store and expose `value` per flag. Add a `getValue(key, defaultValue)` helper.

**`src/components/ui/footer.tsx`**: Replace hardcoded `V1.2.82` with dynamic value from `useFeatureFlags().getValue('app_version', '1.2.82')`.

**Admin panel** (inside existing admin-panel.tsx or a sub-component): Add a small "App Version" card in the header area of the admin dashboard with a text input and "Update" button that upserts the `app_version` flag row.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/submit-rainz-prediction/index.ts` | Remove `pickConfidence`, hardcode confidence to 1 |
| DB migration | Add `value` column to `feature_flags`, insert `app_version` row |
| `src/hooks/use-feature-flags.tsx` | Track `value` column, add `getValue()` helper |
| `src/components/ui/footer.tsx` | Use dynamic version from feature flags |
| `src/components/weather/admin-panel.tsx` | Add version editor widget in header area |

