# DryRoutes — Completed Implementation

## What was done

### 1. Renamed "Rain-Free Route Planner" → **DryRoutes** (by Rainz)

### 2. Performance: Fixed Map Lag
- Created `src/hooks/use-lazy-map.tsx` — IntersectionObserver-based lazy mount hook
- All 3 map components (DryRoute, RainMapCard, LiveWeatherMap) now:
  - Lazy-load Leaflet JS/CSS via dynamic `import()`
  - Only initialize when scrolled into viewport
  - Use `preferCanvas: true` for reduced DOM overhead

### 3. Moved DryRoute to Main Weather Page
- Removed from `explore-sheet.tsx`
- Added as standalone card in `Weather.tsx` (before Feature Ideas)
- Larger default map (h-56)

### 4. Fullscreen Mode
- Expand button (⛶) on card header
- Opens fullscreen Dialog overlay with full routing UI

### 5. "Go" Navigation Mode
- Turn-by-turn via `navigator.geolocation.watchPosition()`
- Blue GPS dot on map, auto-centers
- Step-by-step instructions with maneuver icons
- Rain score + ETA in status bar
- Auto-advance to next step when within 30m

### 6. AR Navigation
- Camera overlay with compass-based directional arrow
- HUD showing current instruction, rain probability, ETA
- Reuses proven device orientation pattern from AR overlay

### 7. Additional Features
- **Transport modes**: Drive / Bike / Walk (OSRM profiles)
- **Departure time picker**: Shifts rain forecast window
- **Rain timeline bar**: Visual per-segment rain probability
- **Share route**: Native share or clipboard
- **OSRM steps=true**: Full turn-by-turn instructions

## Files
| File | Action |
|------|--------|
| `src/hooks/use-lazy-map.tsx` | NEW — IntersectionObserver hook |
| `src/components/weather/dry-route.tsx` | NEW — Main DryRoute component |
| `src/components/weather/dry-route-navigation.tsx` | NEW — Turn-by-turn panel |
| `src/components/weather/dry-route-ar.tsx` | NEW — AR navigation overlay |
| `src/components/weather/explore-sheet.tsx` | Removed RainRoutePlanner |
| `src/pages/Weather.tsx` | Added DryRoute card |
| `src/components/weather/rain-map-card.tsx` | Lazy map loading |
| `src/components/weather/live-weather-map.tsx` | Lazy map loading |
| `src/components/weather/rain-route-planner.tsx` | DELETED |
