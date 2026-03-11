

# Plan: DryRoutes v2 — Activity Tracking & UX Improvements

## 1. Fix Existing Build Errors (prerequisite)

Before adding features, the current build errors must be resolved:
- **AppMode type**: Change `'draw'` references to `'create-route'` (the actual type) or add `'draw'` back to the union
- **`setIsDrawing` / `isDrawing`**: Either declare the missing state or replace with the correct variable name used in the create-route mode
- **`saved_routes` / `saved_activities` Supabase calls**: These tables don't exist in the typed schema. Convert to `supabase.rpc()` calls or cast through `unknown`, or remove the save-to-DB logic and keep it local-only for now
- **`fetchSavedRoutes` used before declaration**: Move the `useCallback` definition above the `useEffect` that references it
- **Deno zod import in `fetch-moon-data`**: Fix the import path

## 2. Add "Running" Transport Mode

Currently Track mode only offers Walking and Cycling. Add a **Running** option:
- Add `'running'` to the `TransportMode` union type
- Add a new entry in `TRANSPORT_MODES` with a running icon (use `Zap` or import a running person icon)
- Running uses the OSRM `foot` profile (same as walking) but with different pace/calorie calculations:
  - Running calories: ~80 kcal/km (vs 65 for walking)
  - Running default pace display: min/km format
- Show Running in Track mode's transport selector (alongside Walk and Bike)

## 3. Live Split Times & Pace Graph

When tracking an activity, show **per-kilometer split times**:
- Every time `trackDistance` crosses a new km threshold, record the elapsed time
- Display splits as a small list: "km 1: 5:32, km 2: 5:18..."
- After completing a run, show a simple pace chart (bar chart of splits) using existing Recharts dependency

## 4. Auto-Pause Detection

Detect when the user has stopped moving and auto-pause the tracker:
- If no GPS movement >10m in the last 15 seconds, show a subtle "Paused — not moving" indicator
- Auto-pause the elapsed timer so rest stops don't inflate pace
- Resume automatically when movement resumes
- This prevents inflated run times from traffic lights, breaks, etc.

## 5. Elevation Profile for Routes

Add basic elevation data to tracked and drawn routes:
- Fetch elevation from Open-Meteo Elevation API (`https://api.open-meteo.com/v1/elevation`) for sampled route points
- Show a small elevation profile chart below the route summary
- Display total elevation gain/loss in the summary card

## 6. Route Sharing as Image

After completing a track or drawing a route:
- Use the existing `html-to-image` dependency to capture the map + stats as a shareable PNG
- Add a "Share" button that generates the image and opens the Web Share API (or downloads)
- Overlay the route stats (distance, time, pace) on the image

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/weather/dry-route.tsx` | Fix build errors, add Running mode, split times, auto-pause, elevation fetch, share image |

## Implementation Order

1. Fix all build errors first (type mismatches, missing state, declaration order)
2. Add Running transport mode to Track
3. Add split times tracking logic + UI
4. Add auto-pause detection
5. Add elevation profile (API call + mini chart)
6. Add share-as-image functionality

