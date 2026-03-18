# Plan: DryRoutes Standalone Page with Google Maps-style Redesign

## Overview

Move DryRoutes from a card on the weather page to a dedicated full-page route at `/dryroutes`. Redesign the UI to be fully immersive (no header/footer) like Google Maps, with a full-screen map, floating search bar, category chips for nearby POIs (via Overpass API), and a draggable bottom sheet for controls/results.

## 1. New Page: `src/pages/DryRoutes.tsx`

- Register route `/dryroutes` in `App.tsx` (lazy loaded)
- This page renders the refactored DryRoute component in **full-page mode** (not card mode)
- No header, no footer -- fully immersive viewport
- The Footer component should detect if the route is `/dryroutes` and hide itself (or the page is rendered outside the footer wrapper)

## 2. Change DryRoute Card on Weather Page

- Make the old DryRoutes card embed the new /DryRoutes page into the card

## 3. Redesign DryRoute Component -- Google Maps Style

The current 2229-line component will be refactored into a full-page layout:

### Layout (mobile-first, like the uploaded screenshot)

```text
+------------------------------------------+
|  [Search bar]  [Voice] [Camera] [Avatar] |  <- floating over map
|  [Restaurants] [Coffee] [Shopping] [...]  |  <- category chips
|                                          |
|              FULL-SCREEN MAP             |
|                                          |
|                          [Location btn]  |  <- floating FAB
|                          [Directions btn] |
+------ draggable bottom sheet ------------+
|  Location Name           Weather Icon    |
|  Route controls / Results / Track mode   |
+------------------------------------------+
```

### Key UI Changes

- **Full-screen map**: Map fills entire viewport (100vh, 100vw)
- **Floating search bar**: Glass-style pill at the top, overlays the map. Tapping opens a full search view
- **Category chips**: Horizontal scrollable row below search (Restaurants, Coffee, Shopping, Pharmacies, etc.)
- **Floating action buttons**: Bottom-right corner -- location centering button + directions button (like Google Maps blue diamond)
- **Draggable bottom sheet**: Slides up from bottom. Collapsed = shows location name + weather. Expanded = full route controls (from/to inputs, transport mode, results, track mode, draw mode)
- **Back button**: Top-left arrow to navigate back to `/` (weather page)
- **No Card wrapper**: Remove all Card/CardHeader/CardContent wrappers

### POI Integration (Overpass API)

- New edge function `supabase/functions/search-nearby-pois/index.ts`:
  - Accepts `lat`, `lon`, `category`, `radius` (default 1km)
  - Queries Overpass API: `https://overpass-api.de/api/interpreter`
  - Returns POIs with name, type, lat/lon, address
  - Categories: restaurant, cafe, shop, pharmacy, atm, supermarket, etc.
  - Includes server-side caching (1min TTL like geocode function)
- Category chips call this edge function and render POI markers on the map
- Tapping a POI marker shows a small popup (name, type, distance)
- POIs can be set as route destination

### Map Tile Style

- Switch from plain OSM tiles to a dark-themed tile for dark mode (e.g., CartoDB Dark Matter: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- Light mode uses CartoDB Voyager: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- Both are free with no API key required

## 4. Bottom Sheet Component

New component `src/components/weather/dry-route-bottom-sheet.tsx`:

- Draggable handle at top (like Google Maps)
- Three snap points: collapsed (showing location name), half (route inputs visible), full (all results/details)
- Contains the existing mode switcher, transport modes, from/to inputs, results, track mode, draw mode content
- Touch gestures for drag up/down

## 5. Files to Create/Modify


| File                                                | Action                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/pages/DryRoutes.tsx`                           | **Create** -- new standalone page                                                                         |
| `src/components/weather/dry-route-bottom-sheet.tsx` | **Create** -- draggable bottom sheet                                                                      |
| `supabase/functions/search-nearby-pois/index.ts`    | **Create** -- Overpass API proxy for POIs                                                                 |
| `supabase/config.toml`                              | **Edit** -- add `search-nearby-pois` function config                                                      |
| `src/components/weather/dry-route.tsx`              | **Edit** -- refactor to support full-page mode, add POI layer, category chips, new map tiles, floating UI |
| `src/pages/Weather.tsx`                             | **Edit** -- remove DryRoute card, add link/button to `/dryroutes`                                         |
| `src/App.tsx`                                       | **Edit** -- add `/dryroutes` route (lazy), conditionally hide footer on this route                        |


## 6. Implementation Order

1. Create the `/dryroutes` route and page shell
2. Hide footer on `/dryroutes`
3. Refactor DryRoute to full-page layout (full-screen map, floating UI)
4. Build the draggable bottom sheet
5. Add dark/light map tiles (CartoDB)
6. Create POI edge function (Overpass API)
7. Add category chips + POI markers on map
8. Remove DryRoute card from Weather page, add navigation link
9. Polish transitions and mobile UX