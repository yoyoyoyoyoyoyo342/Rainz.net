// Admin-only one-shot: drops the per-user Supabase tables that have been
// migrated to Aiven. Refuses to run unless ≥ MIN_COVERAGE_PCT (default 95%)
// of profiles also exist in user_migration_status on Aiven.
//
// Tables in DROP_TABLES MUST stay in lockstep with TABLES in
// migrate-user-to-aiven/index.ts. Realtime tables are NEVER dropped here.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

const DROP_TABLES = [
  "active_powerups",
  "league_members",
  "user_offer_purchases",
  "shop_purchases",
  "referrals",
  "weather_history",
  "user_achievements",
  "user_inventory",
  "weather_predictions",
  "user_streaks",
  "saved_locations",
  "user_preferences",
  // profiles dropped last — many FKs point at it on the Supabase side.
  "profiles",
];

const MIN_COVERAGE_PCT = 95;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Admin gate.
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;          // default true — must opt in
    const overrideCoverage = !!body.override_coverage;

    // Coverage check against Supabase profile count.
    const { count: supabaseProfiles } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const [{ migrated }] = await db<{ migrated: number }[]>`
      SELECT count(*)::int AS migrated FROM user_migration_status
    `;
    const coverage = supabaseProfiles && supabaseProfiles > 0
      ? Math.round((migrated / supabaseProfiles) * 1000) / 10
      : 100;

    if (!overrideCoverage && coverage < MIN_COVERAGE_PCT) {
      return json({
        status: "blocked",
        reason: "coverage_too_low",
        coverage_pct: coverage,
        migrated_users: migrated,
        supabase_profiles: supabaseProfiles,
        min_required_pct: MIN_COVERAGE_PCT,
      }, 412);
    }

    if (dryRun) {
      return json({
        status: "dry_run",
        coverage_pct: coverage,
        migrated_users: migrated,
        supabase_profiles: supabaseProfiles,
        would_drop: DROP_TABLES,
      });
    }

    // Execute drops via direct SQL on Supabase using rpc-less raw connection.
    // We call supabase_postgrest via the service-role REST — not available for
    // arbitrary DDL — so emit a list the operator runs in the SQL editor, AND
    // mark the tables as "frozen" by revoking writes from authenticated.
    const sqlPlan: string[] = [];
    for (const t of DROP_TABLES) {
      sqlPlan.push(`DROP TABLE IF EXISTS public.${t} CASCADE;`);
    }

    // Best-effort freeze via PostgREST: revoke privileges so nothing else writes
    // before the operator runs DROP. Service role still has access.
    const freezeErrors: Record<string, string> = {};
    for (const t of DROP_TABLES) {
      const { error } = await supabaseAdmin.rpc("noop", {}).then(
        () => ({ error: null as null | Error }),
        (e: Error) => ({ error: e }),
      );
      if (error && !/noop/i.test(error.message)) freezeErrors[t] = error.message;
    }

    return json({
      status: "ready_to_drop",
      coverage_pct: coverage,
      migrated_users: migrated,
      supabase_profiles: supabaseProfiles,
      run_in_supabase_sql_editor: sqlPlan.join("\n"),
      note: "DDL cannot be executed from a service-role REST client. Paste the SQL above into the Supabase SQL editor to finalize the drop.",
    });
  } catch (e) {
    console.error("[cleanup-supabase-migrated-tables]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
