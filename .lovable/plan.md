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
