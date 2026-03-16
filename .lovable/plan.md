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
- Blue GPS dot on map, auto-centers[text]
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

### 8. Fixed Rainz/Temp/Wind Layers on Weather Map
- Fixed layer visibility issue preventing Rainz, Temperature, and Wind layers from displaying
- Ensured all weather data layers render correctly on LiveWeatherMap

### 9. Fixed Map Loading on Track Mode in DryRoutes
- Fixed map component initialization in Track mode
- Resolved lazy-loading conflict with Track mode navigation

### 10. Added Update Counter & Improved DryRoutes
- Added update counter to footer showing route recalculation status
- Improved DryRoutes UI/UX with better visual feedback
- Enhanced route planning experience with update indicators

### 11. Fixed Rain Cloud Layer Display in DryRoutes
- Added missing zoom constraints (`minZoom: 0`) to rain/precipitation layer
- Added proper z-index stacking (`zIndex: 500`) to ensure layer visibility
- Rain cloud overlay now displays correctly when Radar button is toggled in Track/Route modes

### 12. Point-Based Route Drawing System
- **Replaced freehand drawing with click-to-place points**: Users now click on map to place discrete points instead of continuous drawing
- **Point types with visual markers**:
  - 🟢 Green circle for start point (route origin)
  - ⚪ Gray circle for waypoints (intermediate points)
  - 🏁 Flag emoji for end point (route destination)
- **Real-time road snapping**: Each point pair automatically snaps to road network via OSRM `/match` endpoint
- **Real-time distance counter**: Updates as each point is added and after snapping completes
- **Point management**:
  - Click any marker to delete that specific point
  - "Undo Last" button removes most recent point
  - "Clear All" button resets entire route
  - Point type selector allows switching between point types while placing
- **Route confirmation dialog**: When "Done!" is clicked, shows route preview with distance, duration, rain score, and rain timeline before accepting
- **Rain layer visibility**: Precipitation layer now displays consistently in all DryRoutes modes (Route/Track/Create Route) when Radar toggle is enabled

### 13. Route Saving & Activity Tracking System
- **Mode Renamed**: "Draw" mode renamed to **"Create Route"** for clarity and intuitive UX
- **Route Saving Feature**:
  - After creating or finding a route, users can save with custom name via modal
  - Modal shows route name input (required), description (optional), public toggle, and route stats preview
  - Saves to `saved_routes` table with full metadata: geometry, distance, duration, rain score, steps, transport mode
  - Route type tracked: 'found' (Route mode) / 'created' (Create Route mode) / 'tracked' (Track mode)
  - Success toast notification after save, auto-refresh of saved routes list
- **Activity Tracking & Saving**:
  - After completing Track session (stop button), users can save named activity
  - Modal auto-populates with "Activity - HH:MM AM/PM" format, user can edit
  - Saves all GPS points with timestamps, calculates calories/CO2 estimates based on transport mode
  - Saves to `saved_activities` table with complete geospatial data for future playback/analysis
  - Public toggle for future sharing features
- **Track Mode Route Selection**:
  - Dropdown selector in Track mode shows all user's saved routes with distance/duration/rain score
  - When selected, route geometry loads on map with visual markers for endpoints
  - Auto-advance to next waypoint when GPS within 30m (reuses Go navigation logic)
  - Manual GPS tracking still works in parallel and can be saved as new activity
- **Database Schema**:
  - **saved_routes**: Stores user routes with geometry (GeoJSON), rain data, turn-by-turn steps, metadata
  - **saved_activities**: Stores tracked activities with GPS points (lat/lng/timestamp), stats, estimates
  - Row Level Security (RLS) policies ensure users can only see/edit their own routes and public routes
  - Indexes on user_id, created_at, is_public for fast queries

## Files
| File | Action |
|------|--------|
| `src/hooks/use-lazy-map.tsx` | NEW — IntersectionObserver hook |
| `src/components/weather/dry-route.tsx` | Updated: Point-based draw mode, real-time snapping per segment, distance tracking, confirmation dialog, rain layer consistency |
| `src/components/weather/dry-route-navigation.tsx` | NEW — Turn-by-turn panel |
| `src/components/weather/dry-route-ar.tsx` | NEW — AR navigation overlay |
| `src/components/weather/explore-sheet.tsx` | Removed RainRoutePlanner |
| `src/pages/Weather.tsx` | Added DryRoute card |
| `src/components/weather/rain-map-card.tsx` | Lazy map loading |
| `src/components/weather/live-weather-map.tsx` | Lazy map loading |
| `src/components/weather/rain-route-planner.tsx` | DELETED |

### 14. March 2026 Bug fixes & refinements
- **Map overlay z‑index**: Fixed issue where fullscreen map would cover route name/save UI in Create Route mode. Modals and bottom sheets now use `z-[2000]` so they always float above map controls.
- **Distance counter**: Waypoint distance now calculated on every click using straight‑line haversine math; removed road snapping. Display updates immediately instead of sticking at 0.00 km.
- **Road snapping removed**: OSRM snapping logic stripped from draw mode; routes may pass freely through forests or off‑road without adjustment.
- **Leaderboard corrections**:
  - Monthly RPC updated to filter by `prediction_date` rather than `updated_at` and otherwise mirror the all‑time query. Accuracy now matches the all‑time tab exactly (e.g. Seje_ged’s percentage will be identical).
  - Front‑end fetchMonthlyLeaderboard simplified to trust the RPC output; previous workaround queries were removed.
  - Added trigger that bumps `updated_at` when predictions are verified/points awarded so the monthly leaderboard reflects new points immediately.
- **Radar overlay fixes**: `showRadar` effect now re‑runs when the map instance is created and `initMap` explicitly adds the layer if the toggle is on. This prevents cases where radar was toggled before map load and never appeared.
- **Map stacking tweaks**: Map containers now have `z-0`; all DryRoutes bottom sheets/modals use `z-[2000]` ensuring UI always sits above the map. Cleans up lingering overlay problems.
- **Legal updates**: Added explicit DryRoutes liability disclaimers to Terms of Service and Privacy Policy; updated "last updated" dates.
- **Misc**: plan file updated to document the above changes.
