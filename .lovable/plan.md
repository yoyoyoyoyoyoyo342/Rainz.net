
# Full Plan: Rainz Score + Feature Ideas Card + 3 New Features + Page Declutter

## Summary

This plan covers 5 interconnected changes to the weather page:

1. **Declutter** — Move secondary cards into an "Explore" bottom sheet
2. **Rainz Score** — A 0–100 weather quality badge on the main card
3. **Feature Ideas Card** — "What should I try next?" dismissible suggestions
4. **Weather Personality Quiz** — A shareable 5-question quiz
5. **Heatmap Toggle** — Temperature/Wind/Rain layers on the rain radar map

---

## Part 1: Page Declutter — "Explore" Bottom Sheet

### Current card sequence (too long)

The page currently renders these cards inline, one after another:

- WinterAlerts
- CurrentWeather + Hourly
- Share / AR row
- AffiliateCard
- TenDayForecast
- PollenCard / Snow Index
- MorningWeatherReview
- RainMapCard
- WeatherTrendsCard
- DetailedMetrics
- AQICard
- WeatherReactionsFeed
- WeatherTimeMachine
- StreakChallenge
- Holiday Calendars (Ramadan, Christmas)

### What gets moved into the Explore Sheet

These 4 cards are removed from the main page and placed inside a new `ExploreSheet` component:

- WeatherTimeMachine
- WeatherReactionsFeed
- WeatherTrendsCard
- StreakChallenge

### What stays on the main page (clean, essential)

- WinterAlerts
- CurrentWeather (with Rainz Score badge added)
- Share / AR row
- AffiliateCard
- TenDayForecast
- PollenCard / Snow Index
- MorningWeatherReview
- RainMapCard (with heatmap toggle)
- DetailedMetrics
- AQICard
- **FeatureIdeasCard** (new)
- **"Explore More" button** → opens ExploreSheet
- Holiday Calendars

### ExploreSheet Design

A Radix Dialog bottom sheet (using the existing `Sheet` component from `src/components/ui/sheet.tsx`) with:

- A sticky header: "Explore Rainz ✨"
- Scrollable content with the 4 moved cards stacked inside
- Also contains the **WeatherPersonalityQuiz** (new feature)

### Files changed

- `src/components/weather/explore-sheet.tsx` — New component
- `src/pages/Weather.tsx` — Remove 4 cards from inline, import + render `<ExploreSheet>` and `<FeatureIdeasCard>` before the footer

---

## Part 2: Rainz Score (0–100)

A client-side weather quality score computed from data already available inside `CurrentWeather`. No new API calls.

### Algorithm

All data is already available as props in `current-weather.tsx`:

| Factor | Points | Logic |
|---|---|---|
| Temperature comfort | 30 | Peaks at 68–77°F; drops off sharply below 32°F or above 100°F |
| Precipitation probability | 20 | 0% = 20, 100% = 0 (linear) |
| Wind speed | 15 | 0 mph = 15, 50+ mph = 0 (linear) |
| Humidity | 15 | 40–60% = 15, 0% or 100% = 0 |
| UV Index | 10 | 0–3 = 10, 8+ = 0 |
| Visibility | 10 | 10+ mi = 10, 0 = 0 |

Total: 0–100, always a whole number.

### Badge Design

Placed in the top-right of the main card gradient section, replacing the space next to the refresh button. Styled to match the existing `textColor`/`bgOverlay` variables so it works for both snow (dark text) and normal (white text) conditions.

```
[ ⭐ 74  Great Day ]   ← green, shown in card header right side
[ ⭐ 52  Decent Day ]  ← yellow
[ ⭐ 28  Rough Day ]   ← red/orange
```

The label ("Great Day" / "Decent Day" / "Rough Day") is hidden in compact mode, showing only the number.

### Files changed

- `src/components/weather/current-weather.tsx` — Add `computeRainzScore()` function and score badge in the header row

---

## Part 3: Feature Ideas Card — "What should I try next?"

A new dismissible card placed on the main page after AQICard, before the Explore button.

### Behavior

- Shows 3–4 contextual feature tiles as tappable chips
- Adapts based on whether the user is logged in
- Has a small "✕ Dismiss" button in the top-right
- Dismissal stored in `localStorage` key `rainz_feature_ideas_dismissed_at`
- Reappears after 7 days

### Tile sets

**Not logged in:**
- 🔮 Make a Prediction — Predict tomorrow's weather & earn points
- ⚔️ Battle a Friend — Challenge someone to a weather duel
- 📱 Install the App — Add Rainz to your home screen

**Logged in:**
- 🌍 Weather Wrapped — See your personal weather stats
- ⏰ Explore Time Machine — Look up any past date's weather
- 🎰 Daily Spin — Spin for bonus points (free daily)
- 🧠 Weather Personality — Discover your weather personality type

Each tile has a `onClick` that either navigates, opens a dialog, or opens the ExploreSheet.

### Files changed

- `src/components/weather/feature-ideas-card.tsx` — New component
- `src/pages/Weather.tsx` — Import and render it after AQI, before the Explore button

---

## Part 4: Weather Personality Quiz

A fun 5-question quiz assigning one of 5 weather personality types. Accessed from the FeatureIdeasCard tile and from inside the ExploreSheet.

### Personality types

- ☀️ The Sun Chaser
- 🌧️ The Rain Romanticist
- ❄️ The Blizzard Boss
- 🌪️ The Storm Rider
- 🌤️ The Temperate Soul

### Implementation

- 5 questions, each with 4 answer options that increment scores for specific personalities
- Once all 5 are answered, the highest-scored personality wins
- Result stored in `localStorage` key `rainz_weather_personality`
- Shows a shareable result card using `html-to-image` (same pattern already used in `current-weather.tsx` for the social share card)
- "Retake Quiz" button resets state
- Displayed inside a Dialog (triggered from the FeatureIdeasCard or ExploreSheet)

### Files changed

- `src/components/weather/weather-personality-quiz.tsx` — New component (Dialog + quiz logic + share card)

---

## Part 5: Heatmap Toggle on Rain Radar

Extend `RainMapCard` to support 3 overlay modes with a pill toggle above the map.

### Modes

| Mode | Source | Layer |
|---|---|---|
| 🌧️ Rain | RainViewer API (existing) | Animated radar frames |
| 🌡️ Temperature | Open-Meteo WMS | Color-coded temperature tile layer |
| 💨 Wind | Open-Meteo WMS | Wind speed tile overlay |

### Toggle UI

Three pill buttons above the map: `Rain · Temperature · Wind`

Switching mode:
- Removes the current tile layer from the map
- Adds the new tile layer
- Hides the animation controls when in Temperature or Wind mode (they don't animate)

### Open-Meteo WMS tile URL pattern

```
https://api.open-meteo.com/v1/forecast?...  
(uses WMS GetMap for tile rendering — already free, no key needed)
```

Actually will use a simpler approach: Open-Meteo does not have a tile server, so for Temperature and Wind we'll use the **OpenWeatherMap tile API** free tier which supports `temp_new` and `wind_new` layers at `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={key}`. Since we may not have an OWM key, the fallback is to show a static description overlay instead for those modes, OR use Windy's public tile endpoint.

**Revised approach**: Use RainViewer's existing coverage for rain, and for Temperature/Wind show a "Premium coming soon" placeholder tile inside the existing Plus lock pattern — keeping the UI present without requiring a new API key. This is the safe implementation that adds UI without breaking anything.

### Files changed

- `src/components/weather/rain-map-card.tsx` — Add 3-mode toggle, show Rain animated (existing) or placeholder for Temp/Wind

---

## Implementation Order

1. Create `src/components/weather/explore-sheet.tsx`
2. Create `src/components/weather/feature-ideas-card.tsx`
3. Create `src/components/weather/weather-personality-quiz.tsx`
4. Update `src/components/weather/current-weather.tsx` — Add Rainz Score
5. Update `src/components/weather/rain-map-card.tsx` — Add heatmap toggle
6. Update `src/pages/Weather.tsx` — Wire everything together (move cards, add new components)

---

## No new backend required

All 5 changes are entirely client-side. No new edge functions, database tables, or API keys needed.
