// Grants the "SF Founder" achievement (500 points) to a signed-up user whose
// geolocation lies inside the SF Bay Area bounding box. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import db from "../_shared/db.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rough Bay Area bounding box (Sonoma → South San Jose, Pacifica → Livermore).
const BAY = { minLat: 36.9, maxLat: 38.6, minLon: -123.2, maxLon: -121.5 };
function inBayArea(lat: number, lon: number): boolean {
  return lat >= BAY.minLat && lat <= BAY.maxLat && lon >= BAY.minLon && lon <= BAY.maxLon;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json({ error: "invalid_coords" }, 400);
    }
    if (!inBayArea(lat, lon)) {
      return json({ eligible: false, reason: "outside_bay_area" });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the SF Founder achievement row (created via migration).
    const { data: ach } = await admin
      .from("achievements")
      .select("id, points")
      .eq("requirement_type", "sf_founder")
      .maybeSingle();
    if (!ach) return json({ error: "achievement_missing" }, 500);

    // Already claimed?
    const { data: existing } = await admin
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_id", ach.id)
      .maybeSingle();
    if (existing) return json({ eligible: true, alreadyClaimed: true, points: 0 });

    // Insert achievement + award points.
    const { error: insErr } = await admin
      .from("user_achievements")
      .insert({ user_id: userId, achievement_id: ach.id });
    if (insErr) return json({ error: insErr.message }, 500);

    const points = ach.points ?? 500;

    // Profiles live on Aiven now — update total_points there so the leaderboard
    // and UI actually reflect the bonus.
    try {
      await db`
        UPDATE profiles
        SET total_points = COALESCE(total_points, 0) + ${points},
            updated_at = now()
        WHERE user_id = ${userId}
      `;
    } catch (e) {
      console.error("[claim-sf-founder] Aiven update failed", e);
      return json({ error: "points_update_failed" }, 500);
    }

    // Congratulate them in-app.
    await admin.from("user_notifications").insert({
      user_id: userId,
      title: "🌉 Welcome, SF Founder!",
      message: `You just unlocked the exclusive San Francisco Founder badge and 500 bonus points. Enjoy the Bay Area, and happy predicting.`,
      type: "reward",
      metadata: { code: "sf_founder", points },
    });

    return json({ eligible: true, awarded: true, points });
  } catch (e) {
    return json({ error: (e as Error).message ?? "unknown" }, 500);
  }
});

async function currentPoints(admin: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const { data } = await admin.from("profiles").select("total_points").eq("user_id", userId).maybeSingle();
  return (data?.total_points as number | null) ?? 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
