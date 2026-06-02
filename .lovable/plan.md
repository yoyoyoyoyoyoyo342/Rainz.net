
# Rejn 2.0 — Polish & Feature Pass

A grouped plan covering data correctness, UX polish, new features, and tracking fixes.

## 1. AI Briefing real data (top hero)
- Audit `src/components/rainz/ai-briefing-hero.tsx` — the "60°C" bug comes from passing `current.temperature` without checking unit conversion (the imperial→metric path is sending °F values as °C).
- Pass the canonical Celsius value plus the user's `isImperial` flag to the edge function and let the function convert once.
- Update `supabase/functions/ai-briefing/index.ts` to log/echo inputs and guard against out-of-range temps (clamp + revalidate via raw API fallback if `|t| > 60`).
- Ensure briefing uses the same `weather-api.ts` ensemble source the rest of the page uses (no stale prop).

## 2. Mascot images — remove backgrounds
- The 9 `rejn-*.png` files in `src/assets/` have visible coloured/white backgrounds.
- Re-generate (or run background-removal) on each so they're transparent PNGs on a clean background, then re-upload via `lovable-assets`.
- Replace local imports in `src/components/rejn/rejn-mascot.tsx` with the new asset pointers.

## 3. Mascot placements
Add `<RejnMascot/>` in:
- Empty state of the 15-day forecast (pose: `sit`)
- Predict page hero (pose: `pounce`)
- Social page header (pose: `wave`)
- Loading / skeleton overlay (pose: `sleep`)
- Footer corner sticker (pose: `dance`)

## 4. "What's New in Rejn 2.0" → first-visit popup
- Remove `<WhatsNewSection/>` from `src/pages/Weather.tsx`.
- Create `src/components/rejn/whats-new-dialog.tsx` (Dialog using existing `dialog.tsx`, full-bleed mobile sheet on small screens).
- Trigger logic in `Weather.tsx`:
  - Only between 2026-06-21 → 2026-06-28 (inclusive).
  - For signed-out users: check `localStorage.getItem('rejn_whatsnew_2_seen')`.
  - For signed-in users: new `user_preferences` boolean `seen_whatsnew_2` (migration). Fall back to localStorage if offline.
  - Mark as seen on close.
- Carry over the 6 feature cards from the current section, add the wave mascot, primary CTA "Got it".

## 5. Implement the 6 "What's New" features
- **AI Sky Analyst** — wire `ai-chat` flow to a floating "Ask Rejn" button on the weather page (uses existing `llm-weather-forecast` infra). 
- **Weather Calendar** — add `.ics` export endpoint + button on 15-day forecast (Apple/Google compatible).
- **Predictive Timeline** — new `predictive-timeline.tsx` component showing next 3 inflection points (rain start, temp drop, wind shift) derived from `next12h`.
- **Smart Outfit** — refresh `outfit` component with current+next-3h aware logic.
- **Route Sense** — small banner on weather card linking to DryRoutes with "best window" sourced from hourly precip.
- **AI Certainty** — confidence badge per day in 15-day forecast already typed; render the % chip using ensemble spread.

## 6. 15-day forecast AI summaries
- Extend `supabase/functions/ai-briefing/index.ts` (or new `ai-day-summary`) to accept a single day payload (high/low/condition/precip/wind/uv/certainty) and return one sentence.
- Cache responses per `(lat,lng,date)` for 6h in Supabase `weather_ai_summaries` table.
- Render under each day row in `ten-day-forecast.tsx` (lazy-load when day expanded to avoid burning Groq quota).

## 7. Predictions revamp (`src/pages/Predict.tsx` + components)
- Add hero with mascot + streak meter + multiplier ring.
- Replace dry temp inputs with sliders that show emoji reactions and "feels like" preview.
- Add quick-bet chips (Rain? Yes/No, Hotter than yesterday? +/-).
- Show animated battle invitations and result reveal animation.
- Tighten copy with Scandi/Gen-Z voice from language-context.

## 8. Social page revamp (`src/pages/Social.tsx`)
- New header with wave mascot + live count of nearby reactions.
- Sticky emoji reaction bar with haptic ripple.
- Card feed redesigned: avatar, distance chip, emoji burst, time-ago.
- Trending emoji rail at top; map peek strip linking to fullscreen map.

## 9. Global UI polish
- Tighten spacing scale, unify `RainzCard` paddings.
- Promote glass-card variants (rename to `rejn-card` aliases; keep old export).
- Refresh primary button states (hover glow, pressed haptic).
- Audit color tokens for AA contrast; bump muted-foreground +5% L in light mode.
- Skeletons: replace remaining solid shimmers with mascot-sleep placeholders on large cards.

## 10. Search dropdown cutoff (image issue)
- The location search results in `Weather.tsx` are clipped because their parent has `overflow-hidden` (the header glass container).
- Move the search results `Popover/Listbox` into a portal (`Radix Popover` with `portal`) or render via `createPortal` to `document.body`, with `position: fixed` and computed anchor rect.
- Add `z-50` and proper viewport padding so it never sits under the keyboard.

## 11. Amplitude event tracking audit
- `use-amplitude-instrumentation.tsx` only tracks page views, generic clicks, form submits, errors. Many domain events never fire.
- Add explicit `amplitude.track()` calls at:
  - Location search executed, location selected, geolocate used
  - Prediction submitted (with multiplier, type)
  - Battle created / accepted / resolved
  - Weather refresh, unit toggle, theme toggle, language change
  - Briefing rendered, briefing refresh, briefing audio toggle
  - 15-day day expanded, calendar export clicked
  - What's-new dialog shown / dismissed / CTA clicked
  - Social reaction posted
  - PWA install prompt shown / accepted
- Standardize event naming `domain_action` and ensure `user_id` + `route` props attached via global enrichment middleware.
- Verify Amplitude init runs once (`main.tsx`) and Session Replay still at 100%.

## Technical notes
- DB migration: `ALTER TABLE user_preferences ADD COLUMN seen_whatsnew_2 boolean DEFAULT false;` + new `weather_ai_summaries` table with `(lat, lng, date)` PK, `summary text`, `created_at`, RLS allowing service_role write + authenticated/anon read, with required GRANTs.
- Briefing fix: temperature normalization centralized in `weather-api.ts` (`toCelsius()` helper).
- Mascot transparency: regenerate via image-edit, re-upload through `lovable-assets create`.
- All new components use existing semantic tokens — no raw colour classes.
- Keep service-worker preview-host bypass already in place.

## Out of scope
- No backend schema changes beyond the two above.
- No new third-party libraries.
