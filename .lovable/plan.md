## Plan: Rainz Route Planner Overhaul

### Rename

**"Rain-Free Route Planner" → "Rainz DryRoutes (or just DryRoutes for short)"** — short, brandable, memorable. Alternative options: "RainDodge", "DryWay", "Rainz Routes".

### 1. Performance: Fix Map Lag

All three Leaflet map components (DryRoute, RainMapCard, LiveWeatherMap) initialize eagerly. This kills scroll performance.

**Fix:**

- **Lazy-load Leaflet** — wrap all map components with `React.lazy()` + `Suspense`, so Leaflet JS/CSS only loads when the component is visible
- **Add `IntersectionObserver`-based lazy mount** — maps only initialize when scrolled into viewport (not on page load)
- **Destroy maps when not visible** — especially LiveWeatherMap inside the Explore sheet should unmount its map when sheet closes
- **Use `preferCanvas: true**` on Leaflet map options to reduce DOM nodes

### 2. Move DryRoute to Main Weather Page

- Remove `<RainRoutePlanner>` from `explore-sheet.tsx`
- Add it to `Weather.tsx` as a standalone card near the bottom (before FeatureIdeasCard), with its own prominent section
- Give it a slightly larger default map (h-56 instead of h-48)

### 3. Fullscreen Mode

- Add an expand button (⛶) on the card header
- When clicked, render the entire DryRoute component in a `Dialog` that fills the viewport (`h-[100dvh] w-full`)
- Map resizes to fill available space, route list becomes a bottom sheet overlay
- Close button returns to card view

### 4. "Go" Navigation Mode (Turn-by-Turn)

After finding routes and selecting one, add a **"Go"** button:

- **Navigation state**: `idle` → `navigating`
- Uses `navigator.geolocation.watchPosition()` to track user's real-time position
- Shows a blue dot on the map that follows the user
- Map auto-centers on user position with heading rotation
- **Bottom panel** shows:
  - Next turn direction + distance ("Turn right in 300m")
  - Current rain probability at user's position
  - ETA with rain forecast along remaining route
  - "End Navigation" button
- **Turn instructions**: Parse OSRM step-by-step instructions (add `steps=true` to the OSRM request)
- Recalculate rain score for remaining route segments periodically

### 5. AR Navigation Mode

Add an "AR" toggle button during navigation:

- Opens device camera (reuse pattern from existing `ar-weather-overlay.tsx`)
- Overlays:
  - Directional arrow pointing toward next waypoint (using device compass heading vs waypoint bearing)
  - Distance to next turn
  - Rain probability ahead (color-coded: green/yellow/red)
  - Current speed + ETA
- Semi-transparent HUD at top showing route summary
- Uses `deviceorientation` API for compass heading (already proven in AR overlay)

### 6. Additional DryRoute Features

- **Departure time picker**: "Leave at 3pm" — shifts the rain forecast window to match planned travel time instead of "now"
- **Rain timeline on route**: Visual bar showing rain probability at each segment of the journey over time
- **Walking/Cycling mode**: Add transport mode toggle (OSRM supports `driving`, `walking`, `cycling`)
- **"Share route" button**: Generate a shareable link or image card of the route with rain overlay
- **Live rain radar overlay**: Toggle OWM rain tiles on the route map (reuse `owm-tile-proxy` edge function)

### Files to Create/Edit


| File                                              | Action                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/weather/dry-route.tsx`            | Rename + full rewrite of rain-route-planner with navigation, fullscreen, AR, lazy map |
| `src/components/weather/dry-route-navigation.tsx` | New — turn-by-turn navigation bottom panel                                            |
| `src/components/weather/dry-route-ar.tsx`         | New — AR navigation overlay                                                           |
| `src/components/weather/explore-sheet.tsx`        | Remove RainRoutePlanner import/usage                                                  |
| `src/pages/Weather.tsx`                           | Add DryRoute card to main page                                                        |
| `src/components/weather/rain-map-card.tsx`        | Add lazy mount with IntersectionObserver                                              |
| `src/components/weather/live-weather-map.tsx`     | Add lazy mount with IntersectionObserver                                              |
| `src/components/weather/rain-route-planner.tsx`   | Delete (replaced by dry-route.tsx)                                                    |
