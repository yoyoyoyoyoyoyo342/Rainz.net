# Upgrade Rainz Wrapped + Improve Rainz

## Part 1: Upgrade Weather Wrapped (6 slides, up from 4)

### New Slides

**Slide 5 -- "Confidence Gambler"**
Shows how many times the user picked Safe (1x), Confident (1.5x), and All-In (2.5x). Displays their "risk personality" (Cautious Player / Calculated Risk-Taker / Fearless Gambler) and their boldest correct prediction (highest multiplier where `is_correct = true`). Blue-to-indigo gradient.

**Slide 6 -- "Battle Record"**
Shows wins, losses, win rate from `prediction_battles`. Highlights their most-battled opponent and best victory. Rose-to-red gradient with a Swords icon.

### Improvements to Existing Slides

- **Fix rank detection**: The current code matches by `total_points` which can collide between users. Update the `get_leaderboard` SQL function to also return `user_id`, then match by `user_id` in the Wrapped query.
- **Swipe navigation**: Add `onTouchStart`/`onTouchEnd` handlers so mobile users can swipe between slides. No new dependencies needed -- just track touch delta and navigate if > 50px.
- **Auto-advance progress bar**: A thin white bar at the top of each slide fills over 5 seconds, then auto-advances. Pauses on user interaction, resumes after 3s idle. Stops on last slide.
- **Condition breakdown on Stats slide**: Show a mini bar chart of top 3 predicted conditions (e.g., "Sunny 45%, Rainy 30%") instead of just the total count.

### Data Changes

Expand the `WrappedData` interface with:

- `battleWins`, `battleLosses`, `battleWinRate`
- `confidenceBreakdown` (count of 1x, 1.5x, 2.5x picks)
- `boldestCorrectPrediction` (highest multiplier with `is_correct = true`)
- `topRival` (most-battled opponent display name)

Fetch battle data from `prediction_battles` and confidence data from `weather_predictions.confidence_multiplier` in the existing query function.

---

## Part 2: Multi-City Rainz Bot with Real Location Names

### The Problem

The bot currently only predicts for Oslo. When expanded to multiple cities, location names must always be real city names (e.g., "London", "Tokyo"), never raw coordinates like "Weather Station 51.510, -0.130".

### The Fix

Update `submit-rainz-prediction/index.ts` to loop through a hardcoded array of 5 cities with their real names:

```text
const LOCATIONS = [
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
];
```

For each location, the bot:

1. Checks if it already predicted for that location + date (using both `prediction_date` and `location_name`)
2. Fetches forecast from Open-Meteo for that location
3. Picks a random confidence multiplier per prediction
4. Inserts with `location_name` set to the hardcoded real city name (never coordinates)

This guarantees location names are always human-readable because they come from the hardcoded array, not from any geocoding API that might return raw coordinates.

---

## Part 3: Points History Component

New component `points-history.tsx` showing a chronological timeline of point-earning events:

- Prediction results (date, location, points earned/lost, confidence used)
- Battle outcomes (opponent, win/loss, bonus points)

Add a "History" tab in the prediction dialog using this component.

---

## Part 4: Weekly Recap Push Notification

New edge function `weekly-recap` triggered by cron at `0 9 * * 1` (Monday 9 AM UTC). Sends a push notification summarizing each user's past 7 days: predictions made, accuracy, points earned, and current streak.

Part 5: Fix battles

Fix battles opening to a black screen

---

## Files Changed


| Action    | File                                                  | Change                                                                                                                                                               |
| --------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit      | `src/components/weather/weather-wrapped.tsx`          | Add 2 new slides (Confidence Gambler, Battle Record), swipe navigation, auto-advance progress bar, condition breakdown chart, expand WrappedData interface and query |
| Migration | SQL                                                   | Update `get_leaderboard` to also return `user_id` for proper rank matching                                                                                           |
| Edit      | `supabase/functions/submit-rainz-prediction/index.ts` | Loop through 5 cities with hardcoded real names, check per-location duplicates, random confidence per city                                                           |
| Deploy    | `submit-rainz-prediction`                             | Redeploy                                                                                                                                                             |
| Create    | `src/components/weather/points-history.tsx`           | New component showing chronological point-earning events                                                                                                             |
| Edit      | `src/components/weather/prediction-dialog.tsx`        | Add "History" tab using PointsHistory component                                                                                                                      |
| Create    | `supabase/functions/weekly-recap/index.ts`            | Edge function that sends weekly summary push notifications                                                                                                           |
| Migration | SQL                                                   | Cron job for weekly-recap at `0 9 * * 1`                                                                                                                             |


## Technical Details

### Rank fix -- updated leaderboard RPC

Add `p.user_id` to the `get_leaderboard` return columns so the Wrapped component can match by `user_id` instead of by `total_points`.

### Swipe navigation (no dependencies)

```text
onTouchStart -> record startX
onTouchEnd -> if deltaX > 50px, go previous; if deltaX < -50px, go next
```

### Auto-advance progress bar

CSS animation fills a thin white bar across slide top over 5 seconds. On completion, advance slide. Any touch/click pauses it, resumes after 3s idle. Stops on last slide.

### Multi-city bot -- guaranteed real names

Each city in the `LOCATIONS` array has a hardcoded `name` field. The bot uses `location_name: loc.name` directly in the insert -- no geocoding step, no risk of coordinate strings. The duplicate check queries by both `prediction_date` and `location_name` so the bot submits one prediction per city per day.

### Confidence Gambler slide data

```text
Query: SELECT confidence_multiplier, COUNT(*), 
       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)
FROM weather_predictions 
WHERE user_id = ? AND confidence_multiplier IS NOT NULL
GROUP BY confidence_multiplier
```

### Battle Record slide data

```text
Query from prediction_battles where challenger_id = user_id OR opponent_id = user_id
Calculate wins (winner_id = user_id), losses, and most frequent opponent
```