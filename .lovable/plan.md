# Rejn 2.1 — Big Batch Plan

Wide scope, so grouped into ordered workstreams. Each item lists the concrete files/tables it touches.

---

## 1. Auth + Onboarding flow

New signup-only fullscreen minimal onboarding (existing users skip). No pre-login onboarding.

Flow: `Login → Cookies → Location → Key features → How did you hear about us → Thanks`.

- Rewrite `src/pages/Auth.tsx`:
  - Screen 1: existing login/signup (retain Google-first minimal design).
  - After successful **signup** (not login), set `profiles.onboarding_step = 1` and route to `/welcome`.
- New route `/welcome` → `src/pages/Welcome.tsx` with a stepper (2–6):
  - Cookies: reuses `useCookieConsent` accept/reject.
  - Location: calls `navigator.geolocation` and persists to `profiles.location_permission = 'granted' | 'denied'` (fixes PWA re-asking bug — see §7).
  - Features: static carousel of 5 highlights.
  - "How did you hear about us?": radio + Other. Persisted to `profiles.acquisition_source`.
  - Thanks screen with CTA to weather.
- Skip logic: existing users have `onboarding_step = null` or `= 'done'`; a `RequireOnboarding` guard in `App.tsx` only redirects when the profile row shows an in-progress signup created after the migration.

Database (via migration):

- `profiles`: add `onboarding_step TEXT`, `acquisition_source TEXT`, `location_permission TEXT`, `changelog_seen_version TEXT`.
- Backfill: existing rows get `onboarding_step = 'done'`.

Amplitude tracking (see §10):

- Track `onboarding_step_view`, `onboarding_step_complete`, and `acquisition_source_selected` with the chosen value as a user property.

---

## 2. "What did we change?" changelog popup

- New table `app_changelog` (title, body_markdown, image_url, version SEMVER-ish, published_at, is_published).
- Admin form in a new `AdminChangelog` tab in `admin-panel.tsx`: title, body (textarea), image upload to existing `blog_images` bucket, version string, publish toggle.
- Popup component `src/components/rejn/changelog-popup.tsx`:
  - Fetch latest published entry on app mount.
  - Show once per user per version: compare `profiles.changelog_seen_version` (or `localStorage` fallback for guests) with the entry's version.
  - Update `changelog_seen_version` on close.
  - Waits for cookie consent (same pattern used to fix the earlier `whats-new-dialog` bug).

---

## 3. Expanded landmarks (100 cities, hand-refined)

- Rebuild `svgs.tsx` and `registry.ts` to cover 100 cities. Chosen for the target audience: heavy weighting of Scandinavia, Bay Area/US west coast, then major European + world capitals.
- Each SVG rebuilt with:
  - Correct proportions and recognizable silhouettes.
  - Larger default render size (already lifted to `min(72vh, 640px)` — keep).
  - Right-anchored for compact single-object landmarks (Big Ben, Little Mermaid, Space Needle, etc.).
  - Day/golden/night palette variants driven by the existing `PALETTES` object (already fixed in the last turn to parse `6:30 AM` strings).
- Registry uses bounding boxes + display name aliases so map/search results still match. Copenhagen suburbs already fall through to CPH; extend the same pattern to Stockholm/Malmö/Oslo/Bay Area.

---

## 4. World coverage + nearest-8 fallback

Add support for locations we don't cover directly.

- New edge function `nearest-neighbors-forecast`:
  1. Input: `{ lat, lon, locationName }`.
  2. Find 8 nearest known city rows (uses a new `world_cities` table seeded from GeoNames' `cities500` dump — cached to Aiven at build time).
  3. Fetch aggregate weather for each of the 8 in parallel (`aggregate-weather`).
  4. Call `llm-weather-forecast` with the 8-station bundle and instruct Groq to *interpolate* the user's location, not display averages. Prompt weighs stations by inverse distance and altitude delta.
  5. Return one synthesized forecast (temp, wind, humidity, condition, precip probability) plus confidence score.
- Search: replace `location-search`'s geocoder with `geonames-search` edge function backed by GeoNames' free API. Requires `GEONAMES_USERNAME` secret — will be requested with `add_secret` in build mode.
- Client: `use-neighbor-forecast` hook fires when `aggregate-weather` returns "no primary source" for the coordinates.

Database:

- `world_cities` (city, country, admin1, lat, lon, population, timezone). Populated via a one-off `seed-world-cities` edge function run from admin panel.

---

## 5. World-average expansion

Extend `world-weather-average` edge function's baked-in city list from ~30 to ~150 cities, matching the top of the new `world_cities` table by population. The function already handles per-city fetches; the change is data-only.

---

## 6. PWA/App gating markers + more locked features

- `use-app-platform` already returns `isPWA` / `isDesktop`. Extend `<AppOnlyGate>` to wrap:
  - Prediction Battles (already gated).
  - Ask Rejn chat sidebar/history (chat itself remains public).
  - Weather Time Machine.
  - AR overlay.
  - Streak Challenges.
- New  `<DownloadPWA>` marker. Placed at:
  - Bottom right page but a bit up after 30s dwell.
  - Inside the login screen (below Google button).
  - After posting a social reaction.
  - After a prediction is submitted (in the celebration modal).
  - When a locked feature is tapped in web.
- Each nudge tracked in Amplitude with `nudge_source`.
- It should be Rejn goat saying with a speech bubble telling the user to download the pwa with a link to how.
- Should only be displayed on the site, never the pwa.

---

## 7. Bug fixes

- **UV index resets midday**: Bug is in `uv-index-graph.tsx` — it currently rebuilds the series from "now onward" on every render, dropping earlier readings. Fix by memoizing the full daily curve from `ensembleForecast.hourly.uv_index` (0–23) and only styling the current hour marker.
- **PWA re-asks for location**: Persist granted/denied state to `profiles.location_permission` (see §1) *and* localStorage (`rejn.location_permission`). `useGeolocation` reads it before calling `navigator.geolocation.getCurrentPosition`. If `denied`, never re-prompt.
- **Days 10–15 fallback text**: `fetch-ensemble-forecast` truncates at 10 days because Open-Meteo's default `forecast_days` is 7 and only some models honor 16. Fix: request `forecast_days=16` explicitly from GFS + ECMWF models, and merge Tomorrow.io's daily 14-day. Update the 15-day component to render real values instead of the fallback string.
- **15-day day-detail crash**: Root cause unconfirmed — plan starts with a repro (open day 11, capture console) via Playwright, then fix. Likely the day-detail component reads `hourly[dayIndex*24]` past the array end for day 10+. Guard with a length check and skeleton for missing hours.
- **"Rainz" → "Rejn" everywhere**: sweep the files ripgrep found (30+ files) and rename all user-visible strings. Keep `src/components/rainz/**` directory paths as-is to avoid a huge diff; only strings change. Also update Rainz Score → Rejn Score, Rejn SkyCam (already partly done), sponsor card.

---

## 8. Docs + AEO/SEO/GEO

- `src/pages/Docs.tsx`: new layout with sidebar TOC, sections for API, MCP, widgets, embed, DryRoutes, changelog. Code samples in copy-friendly blocks.
- Add per-route JSON-LD via `SEOHead` for FAQ, Docs, City pages (already partial), and Blog posts.
- Regenerate `public/llm-full.txt` with the new feature list.
- Update `public/openapi.yaml` for the new `/api/weather` + neighbor-interpolation notes.
- `robots.txt` and `sitemap.xml`: unchanged pattern, sitemap gets new `/welcome` and per-city routes from `world_cities`.
- Trigger a scan via SEO tool once the above lands.

---

## 9. Admin panel rebuild

- New shell `src/components/weather/admin-panel.tsx` using a left-rail nav (Overview, Users, Content, Analytics, Changelog, Feature Flags, Banners, Feature Ideas, Downloads, Broadcasts).
- Overview tab pulls from Amplitude via the existing MCP integration (see §10).
- Analytics tab adds a "How did you hear about us?" bar chart sourced from `profiles.acquisition_source` aggregations.

---

## 10. Amplitude tracking upgrade

- Expand `use-amplitude-instrumentation` to emit route-scoped view events with normalized props (`route`, `is_pwa`, `is_authenticated`, `city`).
- Add explicit events: `signup_completed`, `onboarding_step_view`, `onboarding_step_complete`, `acquisition_source_selected`, `changelog_popup_view`, `changelog_popup_dismissed`, `download_nudge_view`, `download_nudge_click`, `locked_feature_tap`, `neighbor_forecast_used`.
- Set user properties: `acquisition_source`, `platform` (`web`|`pwa`|`ios`|`android`), `is_founder_sf`.
- Admin Analytics tab calls the Amplitude MCP to render:
  - DAU/WAU/MAU.
  - Top routes.
  - Signup funnel (`signup_completed` → each onboarding step → `onboarding_completed`).
  - Acquisition source breakdown.
  - Retention cohort by acquisition source.
- Remove the old Lovable analytics widgets from the admin panel.

---

## Order of execution

1. Database migration (§1, §2, §4 tables; add missing profile columns).
2. Secrets: request `GEONAMES_USERNAME` via `add_secret`.
3. Edge functions: `geonames-search`, `nearest-neighbors-forecast`, `seed-world-cities`, extend `world-weather-average`.
4. Auth + Welcome onboarding pages, guard in `App.tsx`.
5. Changelog popup + admin form.
6. Landmark rebuild (100 cities).
7. Bug fixes (§7).
8. PWA gating + `<DownloadPWA>`.
9. Admin panel rebuild + Amplitude wiring.
10. Docs, SEO/AEO, string sweep, `sitemap.xml` regeneration.
11. SEO rescan.

## Technical notes

- Rejn 1 model: intentionally not mentioned anywhere in code or UI copy per the user's instruction.
- Aiven vs Supabase: `profiles` is Aiven-backed. New `profiles.*` columns must be added via Aiven schema migration (the profiles edge function's DDL block) *and* via a Supabase migration since the trigger `handle_new_user` still writes there. Keep both in sync until the Aiven-only cutover.
- Landmark SVGs: keep the existing palette CSS-variable pattern so day/golden/night still work without extra assets.
- Changelog images: reuse `blog_images` public bucket; no new bucket needed.
- Cookie consent gating for the changelog popup stays consistent with the pattern that fixed the 2.0 dialog bug.

## Out of scope

- Rejn 1 custom model (explicitly deferred).
- Native iOS/Android app changes (unrelated to this batch).
- Payment/subscription changes.