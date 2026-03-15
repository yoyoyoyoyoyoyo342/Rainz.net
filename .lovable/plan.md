

# Plan: Browser-Side Data Caching for Instant Load

## The Idea

Yes — caching user data locally will make the app load significantly faster. Right now, every page load waits for network requests (weather data, profile, saved locations, preferences) before showing content. By persisting React Query's cache to `localStorage`, the app can **show stale data instantly** on load, then silently refresh in the background.

## How It Works

React Query has a built-in **persistor** plugin. It serializes the entire query cache to storage and restores it on startup. This means:

- First visit: loads normally (network)
- Every subsequent visit: **instant render** from cached data, background refresh updates silently
- Works for weather data, profile, saved locations, feature flags — everything

## Changes

### 1. Install `@tanstack/react-query-persist-client` (dependency)

### 2. Update `src/lib/queryClient.ts`
- Create a `localStorage` persistor using `createSyncStoragePersister`
- Export it alongside `queryClient`
- Set `gcTime` to 24 hours (so cached data survives between sessions)

### 3. Update `src/App.tsx`
- Wrap `QueryClientProvider` with `PersistQueryClientProvider` from the persist plugin
- Pass the persistor — this is a drop-in replacement, no other changes needed

### 4. Selective caching
- Mark certain queries as non-persistable (e.g., real-time battle data) using `meta: { persist: false }` if needed
- Weather data, profile, saved locations, and preferences all benefit from persistence

## What Users Experience

- **Before**: White screen / skeleton → wait 1-3s for API → content appears
- **After**: Content appears **instantly** from last session's data → quiet background refresh

## Files Modified
- `src/lib/queryClient.ts` — add persistor config
- `src/App.tsx` — swap provider
- `package.json` — add persist client dependency

This is a small, high-impact change — roughly 20 lines of code total.

