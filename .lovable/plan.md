# Predict Redesign + Location Picker

## Problem
- Prediction form always uses the first saved location with no way to switch.
- The Predict page is a wall of stat cards + an info box + a long form — informative but flat and joyless.

## Goals
1. Let the user pick **one** location to predict for (current GPS or any saved location), switch instantly.
2. Make the predict screen feel like a **game** — punchier, more visual, more rewarding.

---

## 1. Location Picker (the fix)

A single pill-style selector lives at the top of the prediction form (and replaces the static "📍 Oslo" line on the Predict page).

```text
┌──────────────────────────────────────────┐
│ 📍 Predicting for                        │
│ [ 📡 Current ] [ 🏠 Oslo ] [ ✈ Paris ]  │
└──────────────────────────────────────────┘
```

- Horizontally scrollable chips: **Current Location** (uses `navigator.geolocation`, reverse-geocoded to a name) + every row from `saved_locations`.
- Tapping a chip instantly swaps the active location — no submit, no reload. Form state (temps, condition) is preserved; the Rainz Prediction card and submission target re-fetch for the new coords.
- Internal `activeLocation` state defaults to the prop value, then takes over.
- Only **one** location is ever submitted per day — the chip just chooses *which* one.
- Current Location permission uses the existing persistence helper so we don't re-prompt.
- If geolocation is denied/unavailable, the Current chip is shown disabled with a tiny "Enable location" hint.

The Predict page passes the same `selectedLocation` as today; the picker inside the form is the source of truth from that point on.

---

## 2. Predict Page Redesign

Replace the current "stats grid + info card + form" layout with a single focused hero flow.

### A. Hero card — "Tomorrow's Forecast Challenge"
- Big gradient card at the top with tomorrow's date, a countdown to the 21:00 UTC verification ("Locks in 4h 12m"), and the active location.
- Inline streak flame + current rank pill in the top-right (the 4 stat cards collapse into this).
- Subtle animated weather backdrop matching the current Rainz API prediction.

### B. Streamlined Prediction Form
- Location picker chips (section 1).
- **Condition picker** becomes a 2-row icon grid (tap to select, big icons, animated highlight) instead of a dropdown.
- **Temperature** uses two large stepper inputs (−/+ buttons + number) side-by-side with a tiny "Rainz thinks: 18°/24°" hint underneath each — one tap to copy Rainz's value.
- **Confidence Betting** kept but visually upgraded: 3 cards become a slider-style segmented control with live "+X / −Y pts" preview.
- **Live Prediction Preview** card stays but moves directly under the inputs and shows side-by-side vs Rainz Bot ("You vs Rainz").
- **Battle toggle** stays, collapsed by default.

### C. Submit
- Sticky bottom CTA on mobile ("🎯 Lock in prediction") with the potential points reward shown on the button itself, e.g. "Submit · up to +750 pts".

### D. What gets removed / collapsed
- The 4-card stats strip → folded into hero pill.
- The "How Points Work" card → moved behind a small "ⓘ How scoring works" link that opens a sheet.
- Static "📍 Oslo" location line → replaced by the picker.

### E. What stays untouched
- Tabs (Predict / Leaders / History / Shop).
- Battle creation logic, power-ups, first-prediction bonus, share dialog, accept-battle card.
- DB schema, edge functions, verification cron.

---

## Technical Notes
- All changes are frontend-only: `src/components/weather/weather-prediction-form.tsx` and `src/pages/Predict.tsx`.
- New small components: `LocationPicker` (chips), `PredictHero` (gradient card), `ConditionGrid`, `TempStepper`.
- Reuse existing `weatherApi.getWeatherData` for the "Rainz thinks" hint (already fetched by `RainzPredictionCard`).
- Geolocation uses the existing `mem://features/location-permission-persistence` pattern.
- Design tokens only — no hardcoded colors; matches the blue-217 primary + glass-card system.

## Out of Scope
- Changing how predictions are scored or verified.
- Multiple-location-per-day predictions (explicitly rejected per user).
- Backend / schema changes.
