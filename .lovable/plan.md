

## Fix DryRoutes Fullscreen Scrolling

### Root Causes

After reading the actual code, there are **three** scroll-blocking mechanisms:

1. **`flex-1` on the content wrapper (line 637)**: Forces the content to stretch to exactly fill the viewport instead of overflowing. No overflow = nothing to scroll.
2. **`min-h-full` on the inner container (line 624)**: Combined with flex, this constrains the layout to viewport height.
3. **Leaflet map captures all touch/scroll events**: The map at `h-[50vh]` has `scrollWheelZoom` enabled by default, so scrolling over the map zooms the map instead of scrolling the page.

### Changes — `src/components/weather/dry-route.tsx`

**A. Fix the fullscreen portal container (lines 622-643):**
- Outer div: add inline style `{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }` for iOS momentum scrolling
- Inner div: remove `flex flex-col min-h-full` — just use a simple block div
- Content wrapper: remove `flex-1`, keep just `p-4 pb-8`
- Add `useEffect` to set `document.body.style.overflow = 'hidden'` when fullscreen opens (prevents double-scrollbar), restore on close

**B. Disable map scroll-zoom in fullscreen (line 131):**
- After map init, when `isFullscreen` is true, call `map.scrollWheelZoom.disable()` so mouse wheel / touch scroll passes through to the page container
- Keep map draggable so users can still pan the map by dragging

**C. Re-init map when toggling fullscreen:**
- Add `isFullscreen` to the `initMap` dependency array and the `useEffect` that calls it, so the map reinitializes with the correct scroll behavior when entering/exiting fullscreen

