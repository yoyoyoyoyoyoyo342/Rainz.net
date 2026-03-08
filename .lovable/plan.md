

## Fix DryRoutes Fullscreen Scrolling — Root Cause Analysis

### The Real Problems (after reading the actual current code)

**Problem 1: `routeContent` is rendered TWICE when fullscreen is open.**
- Line 631-653: The portal renders `routeContent`
- Line 654: `cardContent` also renders, which contains `routeContent` (line 620)
- This means `mapRef` is fought over by two DOM nodes. The ref attaches to the last one, leaving the portal's map broken.

**Problem 2: Leaflet's `dragging` handler captures all touch events.**
- Even with `scrollWheelZoom: false`, Leaflet's `dragging` module intercepts `touchstart`/`touchmove` on the map div (50vh tall — half the screen).
- The browser sees the touch as "owned" by Leaflet and never scrolls the parent container.
- This is the primary reason scrolling doesn't work on mobile/touch devices.

### Solution

**A. Don't render cardContent when fullscreen is active** (`dry-route.tsx` line 629-655):
```
return (
  <div ref={containerRef}>
    {isFullscreen ? createPortal(...) : cardContent}
  </div>
)
```
This ensures `mapRef` only exists once in the DOM and the map initializes in the correct container.

**B. Split the fullscreen layout into fixed map + scrollable content below:**
Instead of one big scrollable container with the map inside it, use:
- Top: map in a fixed-height non-scrollable section
- Bottom: everything else in a separately scrollable div

This completely sidesteps the Leaflet touch-capture problem because the scrollable area doesn't contain the map.

```
Portal structure:
┌─────────────────────────┐
│ Header (sticky)         │
├─────────────────────────┤
│ Map (h-[45vh], no scroll│  ← Leaflet owns touch here, that's fine
├─────────────────────────┤
│ Route details           │
│ (overflow-y-auto,       │  ← This scrolls freely, no Leaflet interference
│  h-[calc(55vh-header)]) │
└─────────────────────────┘
```

**C. Remove body overflow lock** — it's no longer needed since we use a split layout instead of a single scrollable overlay.

### Files Changed
- `src/components/weather/dry-route.tsx` — restructure fullscreen portal and conditional rendering

