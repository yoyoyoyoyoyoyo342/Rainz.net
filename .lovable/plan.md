

## Plan: Fix Search Overflow, Saved Locations Scroll, and Remove Inbox

### Issues
1. **Search bar dropdown overflows** the card container on mobile because `LocationSearch` uses `overflow-hidden` on its wrapper but the dropdown expands inline, pushing the card height and breaking layout.
2. **Saved locations don't scroll** — the `overflow-x-auto` is there but the container is inside a grid cell that constrains width. Needs explicit `max-w` or `overflow-hidden` on the parent.
3. **Inbox remnants on homepage** — `WeeklyRecapCard` and `BattleAcceptCard` are notification-like elements still on the homepage that should move to Social.

### Changes

**1. Fix LocationSearch dropdown (location-search.tsx)**
- Change the dropdown from inline expansion to an **absolute-positioned overlay** so it floats over content instead of pushing the card layout. Add `relative` to the wrapper, make the results dropdown `absolute top-full left-0 right-0 z-50` with a max-height and scroll.
- Remove `overflow-hidden` from the root wrapper so the absolute dropdown can escape.

**2. Fix saved locations scrollability (Weather.tsx ~line 659-698)**
- Wrap the saved locations + search in a container with `overflow-hidden` to constrain width.
- Add `min-w-0` to the flex/grid child so `overflow-x-auto` actually triggers.
- Add explicit `max-w-full` to the scroll container.

**3. Remove inbox/notification elements from homepage (Weather.tsx)**
- Remove `WeeklyRecapCard` (line 776) from homepage — it belongs in Social.
- Remove `BattleAcceptCard` import and usage (lines 61, 576-588) from homepage — battles belong in Predict/Social.
- Remove associated imports and state (`acceptBattleId`, `clearAcceptBattle`).

### Files Modified
| Change | File |
|--------|------|
| Absolute dropdown positioning | `src/components/weather/location-search.tsx` |
| Scroll fix + remove inbox cards | `src/pages/Weather.tsx` |

