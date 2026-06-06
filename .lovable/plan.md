# Rejn — Aiven migration via Edge Functions

## Architecture (decided)
- **Browser** → `supabase.functions.invoke('<domain>')` → **Supabase Edge Function** → `postgres.js` over TCP → **Aiven Postgres**
- Aiven credentials (`AIVEN_DATABASE_URL`) only ever exist as Supabase secrets. Never in the frontend bundle.
- **Realtime tables stay on Supabase** (`social_posts`, `social_post_comments`, `social_post_likes`, `weather_reactions`, `user_notifications`, `prediction_battles`, `broadcast_messages`). Everything else moves to Aiven.
- Auth stays on Supabase entirely.

## Shared scaffolding (DONE this loop)
- `supabase/functions/_shared/db.ts` — postgres.js pool against `AIVEN_DATABASE_URL`
- `supabase/functions/_shared/auth.ts` — `getAuthUser(req)` + `corsHeaders` + `json()` helper
- Secret `AIVEN_DATABASE_URL` added

## Pilot function (DONE)
- `supabase/functions/user-preferences/` — GET + PUT, `verify_jwt = true`
- `src/hooks/use-user-preferences.tsx` rewritten to call it
- Pattern to copy for every other domain

## Phase-1 weather load (DONE)
- `weather-api.ts` split into `getWeatherData(..., enhance=false)` + `enhanceWeatherData()`
- `Weather.tsx` runs two queries: instant base render, background AI enhancement, 5s timeout, silent fallback to base

## Remaining domain functions to build (group by feature, ~12 total)
Each follows the same pattern: GET/POST/PUT/DELETE, JWT-scoped, public branch where needed.

1. `profiles` — GET (self + by user_id public via `get_public_profile`), PATCH ✅ DONE (edge fn only — frontend callers still on `supabase.from('profiles')`)
2. `saved-locations` — full CRUD ✅ DONE (edge fn + `saved-locations.tsx` migrated)
3. `weather-predictions` — list filtered by date/location, create, update (verify), filters: user_id, prediction_date range, is_verified
4. `user-streaks` — GET, POST ✅ DONE (edge fn + `use-user-streaks.tsx` migrated)
5. `achievements` (public read) + `user-achievements` (per-user)
6. `weather-history` — list by user_id + location, insert
7. `referrals` — list by referrer_id, create
8. `shop` — `shop_offers` (public), `shop_purchases`, `user_inventory`, `user_offer_purchases`, `active_powerups`
9. `seasonal` — christmas/ramadan calendars (public read) + claims (per-user)
10. `leagues` — `prediction_leagues`, `league_members`, `league_invites`
11. `feature-ideas` + `feature_idea_votes` (mixed public read / auth write)
12. `admin` — admin-gated reads (`analytics_events_daily`, `api_usage`, `feature_flags` writes, broadcast inserts, premium_grants, monthly_trophies awards)
13. `public-content` — `blog_posts` (published filter), `city_pages`, `app_versions` — no auth

## Still on Supabase (do not move)
- `social_posts`, `social_post_comments`, `social_post_likes` — realtime feed
- `weather_reactions` — live map reactions
- `user_notifications` — realtime inbox
- `prediction_battles` — realtime battle updates
- `broadcast_messages` — realtime alerts
- All `chat_messages` + `conversations` (live AI chat)

## RPCs / triggers that need to be ported
If/when the tables they touch move to Aiven:
- `has_role(user_id, role)` — replace with `await db\`SELECT 1 FROM user_roles WHERE ...\`` helper in `_shared/auth.ts` (`requireAdmin(user)`)
- `get_leaderboard()`, `get_monthly_leaderboard()` — port SQL into edge function
- `get_public_profile(uuid)` — handled by `profiles` GET with `?user_id=`
- `update_prediction_points` trigger — implement in the `weather-predictions` PUT handler
- `award_monthly_trophy(date)`, `sync_trophy_count_on_award` — call from a cron edge function
- `prune_analytics_events()` — already in Supabase, leaves it there until analytics tables move
- `notify_*` triggers (followers, comments, follows, inbox push) — for moved tables, call `send-push-notification` directly from edge functions

## Order of execution (next loops)
1. `profiles` + `user-streaks` + `saved-locations` (touched everywhere)
2. `weather-predictions` (largest blast radius, owns points/streaks)
3. `seasonal` + `shop` + `referrals`
4. `leagues` + `feature-ideas`
5. `admin` + `public-content`
6. Cleanup: search for any remaining `supabase.from(...)` on a migrated table

## Schema verification before each batch
Before migrating each domain, run a `db\`SELECT column_name FROM information_schema.columns WHERE table_name = '...'\`` smoke test inside the edge function to confirm Aiven has the schema. Add `?ping=1` query handler to each function.

## Things to fix later (out of scope this loop)
- Step 1–2 of the original message (mascot bg, 21–28 June popup, real-data AI briefing, social revamp, 15-day daily summaries, searchbar overflow, Amplitude event audit, What's New 2.0 rollout). Most files already exist (`whats-new-dialog.tsx`, `day-summary.tsx`, `ai-day-summary` edge fn) — needs wiring + audit pass.

## Rejn 2.0 release machinery (DONE this loop)

### Hard refresh (`public/sw.js` v5.0)
- VERSION bumped to `v5.0`, HARD_REFRESH_TAG = `rejn-2.0`
- On `activate`: wipe ALL Cache Storage entries, delete IndexedDB databases (except `firebase-*`), `clients.claim()`, then postMessage `REJN_HARD_REFRESH` to every open client
- `src/main.tsx` listens for that message, clears React Query persisted cache, and reloads once per session (`rejn-hard-refresh-rejn-2.0` flag) — guarantees no user is stuck on 1.x bundles
- New SW registration also wires `updatefound` → `SKIP_WAITING` for future releases

### Per-user lazy Aiven migration
- `supabase/functions/migrate-user-to-aiven/` — service-role read from Supabase, bulk `INSERT … ON CONFLICT DO NOTHING` into Aiven for every user-scoped table in `TABLES[]`. Marks completion in new `user_migration_status (user_id PK, migrated_at, row_counts jsonb)` on Aiven (auto-created on first call). Idempotent.
- `src/hooks/use-aiven-migration.tsx` — fires once per session on `SIGNED_IN` (and on mount if already authed). Mounted from `AnalyticsTracker` in `App.tsx`
- Realtime tables (social_*, weather_reactions, user_notifications, prediction_battles, broadcast_messages, chat_*) intentionally NOT copied — they stay on Supabase

### Supabase cleanup (admin-gated)
- `supabase/functions/cleanup-supabase-migrated-tables/` — checks admin role, computes `migrated_users / supabase_profiles` coverage, refuses if < 95% (override flag available), defaults to `dry_run: true`
- Cannot run DDL through PostgREST → returns the exact `DROP TABLE … CASCADE` SQL for the operator to paste into the Supabase SQL editor. Keeps drop ordering correct (profiles last, child tables first)
- Tables in `DROP_TABLES` are kept in lockstep with `TABLES` in `migrate-user-to-aiven`

### Release checklist when shipping 2.0
1. Merge & deploy — SW v5.0 forces every active client to reload onto the new bundle
2. Monitor `user_migration_status` row count in Aiven over a few days
3. When coverage ≥ 95%: call `cleanup-supabase-migrated-tables` with `{ dry_run: false }` → paste returned SQL into Supabase SQL editor
4. Bump `HARD_REFRESH_TAG` for the next breaking release
