

# Plan: Smoother Animations & Smart Prefetching

## 1. Staggered Fade-In Animations for Weather Cards

Currently, all weather cards appear at once when data loads. We'll add staggered entrance animations so cards cascade in smoothly from top to bottom, giving a polished native-app feel.

**Implementation:**
- Create a small `AnimatedCard` wrapper component that uses `IntersectionObserver` to trigger a fade-in + slide-up animation when the card enters the viewport
- Each card gets a small stagger delay based on its index (50-100ms increments)
- Uses existing `animate-fade-in` keyframes from tailwind config — no new dependencies
- Wrap the main weather content cards (CurrentWeather, TenDayForecast, DetailedMetrics, etc.) in this wrapper

**Files:** New `src/components/ui/animated-card.tsx`, edit `src/pages/Weather.tsx`

## 2. Smooth Page Transitions Between Routes

Add fade transitions when navigating between pages (Weather → About → Blog etc.) so it doesn't feel like a hard page swap.

**Implementation:**
- Wrap the `<Routes>` in `App.tsx` with a CSS transition container
- Use `framer-motion`'s `AnimatePresence` for route-level enter/exit animations (fade + slight scale)
- Lightweight — only affects route boundaries, not individual components

**Files:** Edit `src/App.tsx`, add `framer-motion` dependency

## 3. Smart Prefetching for Saved Locations

Currently only the saved locations list is prefetched. We'll prefetch the actual weather data for the user's saved locations so switching between them is instant.

**Implementation:**
- After the primary location's weather loads, kick off background `queryClient.prefetchQuery` calls for each saved location's weather data
- Limit to top 3 saved locations to avoid excessive API calls
- Use a `useEffect` that watches `savedLocations` + `weatherData` (only fires after initial data loads)
- Prefetched data goes into the same React Query cache with the same `staleTime`, so switching locations hits the cache instantly

**Files:** Edit `src/pages/Weather.tsx`

## 4. Skeleton → Content Crossfade

Replace the hard swap from skeleton to content with a smooth crossfade. The skeleton fades out while the real content fades in simultaneously.

**Implementation:**
- Wrap the skeleton and content blocks in transition containers
- Use CSS `opacity` + `transition` for a 300ms crossfade
- No layout shift — both occupy the same space during the transition

**Files:** Edit `src/pages/Weather.tsx`

## Summary of Changes

| Change | Files | Dependency |
|--------|-------|------------|
| Staggered card animations | New `animated-card.tsx`, edit `Weather.tsx` | None |
| Route transitions | Edit `App.tsx` | `framer-motion` |
| Prefetch saved locations weather | Edit `Weather.tsx` | None |
| Skeleton crossfade | Edit `Weather.tsx` | None |

