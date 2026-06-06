// Aiven-backed edge function for profiles (own profile only).
// GET   → ?user_id=<uuid> public profile (limited fields) — anyone authed can read public fields
//         (omit user_id) → full own profile
// PATCH → update own profile fields
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

const PUBLIC_FIELDS = "id, user_id, username, display_name, avatar_url, bio, created_at, total_points, trophy_count";
const OWN_FIELDS = `${PUBLIC_FIELDS}, notification_enabled, notification_time, country, language_preference, is_imperial`;

const UPDATABLE = new Set([
  "username", "display_name", "avatar_url", "bio",
  "notification_enabled", "notification_time", "country",
  "language_preference", "is_imperial",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);

    if (req.method === "GET") {
      const targetId = url.searchParams.get("user_id");
      if (targetId && targetId !== user.id) {
        const rows = await db`
          SELECT id, username, display_name, avatar_url, bio, created_at, total_points, trophy_count
          FROM profiles WHERE user_id = ${targetId} LIMIT 1
        `;
        return json({ data: rows[0] ?? null });
      }
      const rows = await db.unsafe(
        `SELECT ${OWN_FIELDS} FROM profiles WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      return json({ data: rows[0] ?? null });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json();
      const entries = Object.entries(body ?? {}).filter(([k]) => UPDATABLE.has(k));
      if (entries.length === 0) return json({ error: "no updatable fields" }, 400);

      const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
      const values = entries.map(([, v]) => v);
      const sql = `UPDATE profiles SET ${setClauses}, updated_at = now() WHERE user_id = $1 RETURNING ${OWN_FIELDS}`;
      const rows = await db.unsafe(sql, [user.id, ...values]);
      return json({ data: rows[0] ?? null });
    }

    return json({ error: `Method ${req.method} not allowed` }, 405);
  } catch (e) {
    console.error("[profiles]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
