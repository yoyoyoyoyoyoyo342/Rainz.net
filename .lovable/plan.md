
# Aiven-via-Edge-Functions Refactor — Plan & Required Decisions

I surveyed the codebase before writing any code. The architecture you proposed is sound in principle (browser → edge fn → Aiven), but applied verbatim it will **break the majority of the app**. I need you to confirm trade-offs before I start.

## What I found in the frontend

- **~60 distinct tables** referenced via `supabase.from(...)` across **38 files**
- Heavy use of features your generic GET/POST/PUT/DELETE mapping does **not** cover:
  - `.select('col, joined_table(*)')` embeds/joins
  - `.eq() .in() .gte() .like() .or() .order() .limit() .range() .single() .maybeSingle()`
  - `.upsert(..., { onConflict })`
  - `.rpc('has_role' | 'get_leaderboard' | 'get_monthly_leaderboard' | 'get_public_profile' | ...)`
  - `supabase.channel(...)` realtime (social feed, live reactions, predictions, debates)
  - Public/anon reads (`blog_posts`, profiles, leaderboards, skycam stations, city_pages) — these have no logged-in user

## Hard problems with the literal plan

1. **Latency goes up, not down.** Step 8 asks the app to feel faster. Wrapping every query in an edge function adds 150–500 ms of cold-start + auth round-trip per call. Pages currently fire 5–15 parallel `.from()` queries; turning each into an `invoke()` will make the app dramatically slower, the opposite of what Step 8 wants.
2. **Realtime dies.** `supabase.channel()` only streams changes from Supabase Postgres. If the data lives in Aiven, the social feed, live reactions, prediction battle updates, and broadcast alerts all silently stop working. Aiven has no equivalent.
3. **Anon/public pages break.** Blog, public profiles, leaderboards, city pages, skycam, and the marketing pages read without a user. `getAuthUser()` returning null → 401 → blank pages. They need an explicit "public" branch per endpoint.
4. **`.rpc()` calls have no equivalent.** `has_role`, `get_leaderboard`, `get_monthly_leaderboard`, `get_public_profile`, `award_monthly_trophy`, `manual_verify_predictions`, `prune_analytics_events`, the `notify_*` triggers, etc. all live in Supabase Postgres. If data is in Aiven they need to be ported as raw SQL inside edge functions or as Aiven functions.
5. **The generic CRUD shape doesn't fit real queries.** `weather_predictions` is filtered by date, location, opponent, verified-state, etc.; `social_posts` is filtered by radius + recency; `user_notifications` is paginated and marked-as-read. A flat `GET /table → SELECT *` returns the wrong data and overfetches. Each domain needs query parameters mapped to WHERE clauses.
6. **Edge function count.** Supabase soft-limits matter — 60+ functions is a lot to deploy, monitor, and keep warm. Better to group by domain (≈10–15 functions) than one per table.
7. **Cron + DB triggers.** `prune_analytics_events`, `award_monthly_trophy`, `update_prediction_points`, `notify_on_inbox_insert`, `sync_*_count` triggers all live in Supabase. If raw data moves to Aiven, these stop firing on writes. They need to be re-created in Aiven or replaced with edge-function logic.
8. **I cannot verify Aiven actually has the schema.** Your message says the migration is done, but I have no way to introspect Aiven from here. If even one table is missing or column types differ, every call to that table 500s.

## What I recommend instead

Two viable shapes — pick one:

### Option A — Full migration, done correctly (1–2 weeks of work)
- Group by **domain**, not table: `user-data`, `predictions`, `social`, `weather-data`, `notifications`, `admin`, `public-content`, etc. ~12 functions total.
- Each function is a thin router: `{ action: 'list' | 'get' | 'create' | 'update' | 'delete' | 'rpc-name', filters, payload }`.
- Public endpoints take **no auth**; user endpoints validate JWT; admin endpoints check `has_role` (which must be re-implemented in Aiven).
- Realtime: either keep `social_posts`, `weather_reactions`, `user_notifications`, `prediction_battles` in Supabase (hybrid), or replace realtime with polling (worse UX).
- Port all triggers, cron jobs, and SECURITY DEFINER functions to Aiven.
- Build a thin `src/lib/aiven-client.ts` wrapper that mimics the `.from().select().eq()` chain so component code barely changes.

### Option B — Hybrid (recommended, much smaller blast radius)
- Keep Supabase as the DB for everything **except** the high-growth tables that caused the storage problem (`analytics_events`, `weather_history`, raw weather caches).
- Move only those to Aiven, accessed via 2–3 edge functions.
- Keep auth, realtime, RPCs, triggers, RLS, and 95% of the code untouched.
- Storage problem solved; app keeps working; no 38-file rewrite.

The analytics rollup we shipped last session already cut the DB by ~95%. **Is full migration still necessary, or did the rollup buy enough room?**

## Step 8 — Two-phase weather load (independent of the migration)
This part I can do safely today without touching auth or DB:
- Split `Weather.tsx` into `fetchWeatherData()` (raw Open-Meteo + WeatherAPI) and `fetchAIAggregate()` (LLM enhancement).
- Render raw weather immediately via React Query's `keepPreviousData` + separate query keys.
- AI section gets its own skeleton; 5 s timeout; silent fallback to raw data.
- This is ~2 files changed and an obvious win regardless of which migration option you pick.

## What I need from you before writing code

1. **Did the analytics rollup solve the storage limit?** If yes, **Option B** (hybrid) is far safer. If you still need full migration, confirm Option A.
2. **Realtime features** (social feed live reactions, prediction battle alerts) — keep on Supabase, accept polling, or drop?
3. **Public/anon pages** — confirm those endpoints should be public (no auth) inside the new edge functions.
4. **Can I ship Step 8 (two-phase weather load) right now**, independent of the migration decision? It's a clean win either way.

Once you answer 1–4 I'll either: (a) ship Step 8 + Option B in this loop, or (b) start the Option A scaffolding with a domain-grouped function layout.
