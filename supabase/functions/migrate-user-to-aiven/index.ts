// Per-user lazy migration: copies all of the calling user's rows from Supabase
// Postgres into Aiven, then records a migration marker so we never re-run.
//
// - Called from the frontend after login (see src/hooks/use-aiven-migration.tsx).
// - Idempotent: re-runs are safe; `ON CONFLICT DO NOTHING` everywhere.
// - Realtime tables (social_*, weather_reactions, user_notifications,
//   prediction_battles, broadcast_messages, chat_*) intentionally stay on
//   Supabase and are NOT copied here.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

// Tables that move to Aiven, with the conflict key used for ON CONFLICT.
// Keep in sync with .lovable/plan.md "Remaining domain functions".
const TABLES: Array<{ table: string; conflict: string }> = [
  { table: "profiles",            conflict: "user_id" },
  { table: "user_preferences",    conflict: "user_id" },
  { table: "saved_locations",     conflict: "id" },
  { table: "user_streaks",        conflict: "user_id" },
  { table: "weather_predictions", conflict: "id" },
  { table: "user_inventory",      conflict: "id" },
  { table: "user_achievements",   conflict: "id" },
  { table: "weather_history",     conflict: "id" },
  { table: "referrals",           conflict: "id" },
  { table: "shop_purchases",      conflict: "id" },
  { table: "user_offer_purchases",conflict: "id" },
  { table: "active_powerups",     conflict: "id" },
  { table: "league_members",      conflict: "id" },
];

async function ensureMigrationTable() {
  await db`
    CREATE TABLE IF NOT EXISTS user_migration_status (
      user_id uuid PRIMARY KEY,
      migrated_at timestamptz NOT NULL DEFAULT now(),
      row_counts jsonb NOT NULL DEFAULT '{}'::jsonb
    )
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    await ensureMigrationTable();

    // Short-circuit if already migrated.
    const existing = await db`
      SELECT migrated_at FROM user_migration_status WHERE user_id = ${user.id} LIMIT 1
    `;
    if (existing.length > 0) {
      return json({ status: "already_migrated", migrated_at: existing[0].migrated_at });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const { table, conflict } of TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
        // profiles + user_streaks + user_preferences are keyed on user_id directly;
        // every other table also stores user_id, so this filter is universal.
        if (error) {
          // Table may already be dropped on the Supabase side — treat as no-op.
          if (error.code === "42P01" || /does not exist/i.test(error.message)) {
            counts[table] = 0;
            continue;
          }
          throw error;
        }
        if (!data || data.length === 0) {
          counts[table] = 0;
          continue;
        }

        // Bulk insert via postgres.js multi-row helper with ON CONFLICT DO NOTHING.
        const cols = Object.keys(data[0]);
        await db`
          INSERT INTO ${db(table)} ${db(data, cols)}
          ON CONFLICT (${db(conflict)}) DO NOTHING
        `;
        counts[table] = data.length;
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        console.error(`[migrate-user-to-aiven] ${table} failed:`, msg);
        errors[table] = msg;
      }
    }

    // Only mark fully complete if no table threw.
    if (Object.keys(errors).length === 0) {
      await db`
        INSERT INTO user_migration_status (user_id, row_counts)
        VALUES (${user.id}, ${db.json(counts)})
        ON CONFLICT (user_id) DO NOTHING
      `;
      return json({ status: "migrated", row_counts: counts });
    }

    return json({ status: "partial", row_counts: counts, errors }, 500);
  } catch (e) {
    console.error("[migrate-user-to-aiven]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
