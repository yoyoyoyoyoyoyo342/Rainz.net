# Plan: Ramadan Fix, Remove Rainz+, Hide Calendar When Logged Out, Weather Stats, and UX Improvements

## 1. Fix Ramadan Calendar Claiming (Remove Edge Function Dependency)

The persistent "Unauthorized" error comes from the edge function auth flow. The fix is to bypass the edge function entirely and handle claiming directly on the client using the Supabase client SDK.

**Approach:**

- Remove the `supabase.functions.invoke("claim-ramadan-reward")` call from `ramadan-calendar.tsx`
- Instead, perform all claim logic directly using the Supabase client:
  1. Validate the user is logged in via `useAuth()`
  2. Check sun position client-side (already done)
  3. Verify the calendar day matches today
  4. Check if already claimed via a direct query to `ramadan_claims`
  5. Insert the claim directly into `ramadan_claims` (RLS already allows `auth.uid() = user_id`)
  6. Award rewards by updating `profiles` (shop_points/total_points) -- since RLS allows users to update their own profile
  7. For powerups/inventory, insert into `active_powerups` (RLS allows `auth.uid() = user_id`)
- The `streak_freeze` reward type uses a `user_inventory` table that may not exist or may not have RLS -- will need a migration if so, or fall back to `active_powerups`
- Sun verification stays client-side only (acceptable since rewards are small gamification items)

**Files changed:**

- `src/components/weather/ramadan-calendar.tsx` -- rewrite `handleClaimReward` to use direct Supabase queries

---

## 2. Remove All Traces of Rainz+

The subscription system already returns `isSubscribed: true` for everyone (in `use-subscription.tsx`). But many components still show "Upgrade to Rainz+" UI, locked cards, Crown badges, and premium upsells. All of these need to be cleaned up.

**Files to clean up (removing premium/locked UI, "Upgrade to Rainz+" buttons, Crown badges):**


| File                                                | What to remove/change                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/weather/rain-map-card.tsx`          | Remove `LockedCard` component, remove `useSubscription` import, remove the `if (!isSubscribed)` gate                                       |
| `src/components/weather/aqi-card.tsx`               | Remove the locked/premium gate UI, always show the card                                                                                    |
| `src/components/weather/morning-weather-review.tsx` | Remove "Upgrade to Rainz+" button and premium gate                                                                                         |
| `src/components/weather/weather-trends-card.tsx`    | Remove "Upgrade to Rainz+" button                                                                                                          |
| `src/components/weather/settings-dialog.tsx`        | Remove all `!isSubscribed` conditional blocks showing upgrade prompts, Crown badges on Notifications section, "Manage Subscription" button |
| `src/components/weather/explore-sheet.tsx`          | Remove `LockedFeature` wrapper around WeatherTrendsCard                                                                                    |
| `src/pages/About.tsx`                               | Remove "Rainz+ Premium" section, update FAQ answers to remove Rainz+ mentions                                                              |
| `src/components/subscription/subscription-card.tsx` | Simplify or remove entirely                                                                                                                |
| `src/hooks/use-offline-cache.tsx`                   | Remove `isSubscribed` gates (cache for everyone)                                                                                           |
| `src/hooks/use-experimental-data.tsx`               | Remove Rainz+ reference in console log                                                                                                     |
| `src/lib/offline-cache.ts`                          | Remove "Rainz+ premium" comment                                                                                                            |
| `public/llm.txt`                                    | Remove Rainz+ premium section                                                                                                              |
| `supabase/functions/ai-weather-insights/index.ts`   | Remove Rainz+ mentions from AI system prompt                                                                                               |


---

## 3. Hide Ramadan Calendar When Logged Out

In `src/pages/Weather.tsx`, wrap the Ramadan Calendar rendering in a `{user && (...)}` check so it only shows for logged-in users.

**File changed:** `src/pages/Weather.tsx` (line ~774-789)

---

## 4. Add Weather Stats Section to Explore Sheet

Create a new `WeatherFunFacts` component that displays interesting, dynamic weather statistics based on the current location and weather data.

**Examples of stats:**

- "It has rained every day in 2026 in the U.K. so far"
- "Today is the warmest day this week in [location]"
- "Wind speeds are 40% above average today"
- "The sun sets 2 minutes later today than yesterday"
- "Humidity hasn't dropped below 70% in 5 days"

**Approach:**

- Create `src/components/weather/weather-fun-facts.tsx`
- Generate facts from the existing weather data passed to the Explore Sheet (current weather, hourly/daily forecasts, location name)
- No API calls needed -- derive facts from the data already available
- Add it as the first item in the Explore Sheet

**Files changed:**

- New: `src/components/weather/weather-fun-facts.tsx`
- Edit: `src/components/weather/explore-sheet.tsx` -- add `WeatherFunFacts` component, pass weather data props

---

## 5. Make Rainz a Better Experience (UX Polish)

Small improvements across the app:


| Improvement                   | Details                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| **Smoother Explore Sheet**    | Add description to ExploreButton: "Stats, Time Machine, Reactions, Trends, Challenges" |
| **Better empty states**       | When no weather data is loaded, show a friendlier welcome screen                       |
| **Cleaner footer**            | Simplify the data attribution footer                                                   |
| **Remove dead premium pages** | Clean up references to subscription success/cancel pages if they serve no purpose now  |


---

## Technical Details

### Database Changes

- Check if `user_inventory` table exists for streak_freeze rewards; if not, use `active_powerups` table instead (which already has proper RLS)
- No new migrations needed if we use `active_powerups` for all powerup-style rewards

### Files Summary


| Action | File                                                |
| ------ | --------------------------------------------------- |
| Edit   | `src/components/weather/ramadan-calendar.tsx`       |
| Edit   | `src/pages/Weather.tsx`                             |
| Edit   | `src/components/weather/explore-sheet.tsx`          |
| Create | `src/components/weather/weather-fun-facts.tsx`      |
| Edit   | `src/components/weather/rain-map-card.tsx`          |
| Edit   | `src/components/weather/aqi-card.tsx`               |
| Edit   | `src/components/weather/morning-weather-review.tsx` |
| Edit   | `src/components/weather/weather-trends-card.tsx`    |
| Edit   | `src/components/weather/settings-dialog.tsx`        |
| Edit   | `src/pages/About.tsx`                               |
| Edit   | `src/hooks/use-offline-cache.tsx`                   |
| Edit   | `src/hooks/use-experimental-data.tsx`               |
| Edit   | `src/lib/offline-cache.ts`                          |
| Edit   | `public/llm.txt`                                    |
| Edit   | `supabase/functions/ai-weather-insights/index.ts`   |
