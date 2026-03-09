

# Plan: Add Strava-like Activity Tracking & Finger-Drawn Routes to DryRoutes

## Overview
Add two new capabilities to DryRoutes:
1. **Activity Tracker** ("Run Mode") -- GPS-based run/walk/cycle tracking with live stats (distance, pace, elapsed time, elevation), similar to Strava
2. **Draw Route** -- finger-draw a route on the map, snap it to roads via OSRM, then get rain forecasts for it

## Architecture

A new tab/mode switcher at the top of DryRoutes with three modes:
- **Route** (existing) -- search A→B routing
- **Track** (new) -- GPS activity recording
- **Draw** (new) -- finger-draw a route on the map

### 1. Track Mode (Activity Tracker)

**UI**: A "Start Run" button. Once started:
- Live elapsed timer (mm:ss)
- Live distance (km/mi), current pace (min/km), average pace
- Map shows the GPS trail as a colored polyline in real-time
- "Pause" and "Stop" buttons
- On stop: summary card with total distance, duration, avg pace, rain encountered, calories burned
- Option to share the activity as an image (reuse existing share pattern)

**Implementation** in `dry-route.tsx`:
- New state: `trackingMode` with `idle | recording | paused`
- `watchPosition` already exists; extend it to push coords into a `trackPoints` array when recording
- Draw polyline on map from `trackPoints` using existing `LRef.current.polyline()`
- Calculate distance with Haversine between consecutive points
- Pace = elapsed time / distance

### 2. Draw Route Mode

**UI**: Toggle "Draw" mode, then touch/drag on the map to freehand-draw a path. On release:
- Collect touch points as lat/lng waypoints
- Sample every ~10th point to reduce noise
- Send sampled waypoints to OSRM `match` API (or `route` with waypoints) to snap to roads
- Display the snapped route with rain overlay (reuse existing rain score logic)
- Show distance, duration estimate, and rain forecast

**Implementation** in `dry-route.tsx`:
- Disable map dragging when draw mode is active (`map.dragging.disable()`)
- Listen to `mousedown/mousemove/mouseup` (and touch equivalents) on the map container
- Convert pixel coords to lat/lng via `map.containerPointToLatLng()`
- On draw end, downsample points, call OSRM match/route API
- Reuse `drawRoutes()` to render the snapped result
- Reuse existing rain score calculation

### 3. UI Integration

Add a simple 3-segment toggle at the top of the DryRoute controls:
```
[ Route | Track | Draw ]
```

- "Route" shows existing from/to search UI
- "Track" shows start/pause/stop + live stats
- "Draw" shows instructions + clear button, map enters draw mode

### Files to modify
| File | Change |
|------|--------|
| `src/components/weather/dry-route.tsx` | Add mode switcher, draw-on-map logic, activity tracking state & UI |

All logic stays in the single `dry-route.tsx` file since it already manages the map instance, GPS tracking, and route display. The tracking and drawing are extensions of existing patterns (GPS watch, polyline drawing, OSRM calls).

### Key technical details
- **Draw snapping**: Use OSRM `/match/v1/{profile}/` endpoint with `radiuses` parameter for GPS-like trace matching, or `/route/v1/` with sampled waypoints
- **Touch events**: Use `pointerdown/pointermove/pointerup` for cross-device compatibility
- **Activity data**: Stored in component state only (no database persistence initially)
- **Rain integration**: Reuse existing `fetchRainForRoute` pattern on drawn/tracked routes

