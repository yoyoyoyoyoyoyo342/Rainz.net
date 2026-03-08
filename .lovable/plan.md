

## New Rainz DryRoutes Feature Ideas

Based on the current implementation (OSRM routing, Open-Meteo rain sampling, turn-by-turn nav, AR mode, departure picker, transport modes), here are fresh features that would differentiate DryRoutes:

---

### 1. Umbrella Score Badge & Route Rating
After calculating a route, assign it a branded "Umbrella Rating" (1-5 umbrellas). Users see at a glance: 1 umbrella = bone dry, 5 = bring a raincoat. This becomes shareable -- "My commute today is a 2-umbrella route."

### 2. Rain Alerts During Navigation
While in "Go" mode, periodically re-sample rain probability along the remaining route. If conditions worsen (e.g. sudden storm approaching), push an in-app alert: "Rain incoming in 15 min -- consider sheltering at [nearby point]." Uses existing Open-Meteo sampling logic on a timer.

### 3. Saved Routes & Favorites
Let users save frequent routes (e.g. "Home to Work") to their Supabase profile. One tap to re-check today's rain score for a saved route without re-entering addresses. Could show a daily morning widget: "Your commute today: 12% rain."

### 4. Route History & Rain Accuracy Tracking
Store past routes with their predicted vs actual rain scores. Over time, show users "DryRoutes was 87% accurate this month." Builds trust and gamification -- ties into the existing prediction accuracy system.

### 5. Multi-Stop Routes (Waypoints)
Allow users to add intermediate stops (e.g. Home -> Coffee Shop -> Office). OSRM supports waypoints natively. Show per-segment rain scores so users know which leg is wettest.

### 6. "Dry Windows" -- Best Time to Leave
Instead of the user picking a departure time, auto-calculate the optimal departure window. Sample rain probability for the next 12 hours at origin, destination, and midpoints, then suggest: "Leave between 2pm-3pm for the driest trip (8% rain)."

### 7. Voice Navigation (Web Speech API)
Add spoken turn-by-turn directions during "Go" mode using `window.speechSynthesis`. Announce turns, rain warnings, and ETA updates. Toggle on/off in navigation controls.

### 8. Live Rain Radar Overlay on Route Map
Toggle the OWM precipitation tile layer onto the DryRoutes map (reuse existing `owm-tile-proxy` edge function). Users can visually see rain cells approaching their route in real time.

### 9. Group Route Planning
"Planning a walk with friends?" Let users share a route link. Others open it and see the same route + live rain score. Could use a simple shareable URL with encoded from/to coordinates.

### 10. Carbon & Calorie Tracker
For cycling/walking modes, show estimated calories burned. For driving, show estimated CO2. Small motivational nudge: "Walk this route and burn ~180 cal while staying dry."

---

### Recommended Priority Order

1. **Dry Windows** (unique differentiator, high value, uses existing infra)
2. **Saved Routes** (retention feature, needs Supabase table)
3. **Rain Alerts During Navigation** (safety, uses existing sampling)
4. **Voice Navigation** (simple Web Speech API addition)
5. **Live Rain Radar Overlay** (visual wow factor, reuses owm-tile-proxy)
6. **Umbrella Score Badge** (branding, shareable)
7. **Multi-Stop Routes** (power user feature)
8. **Route History & Accuracy** (long-term trust building)
9. **Group Route Planning** (social feature)
10. **Carbon & Calorie Tracker** (nice-to-have)

Which features would you like to implement?

