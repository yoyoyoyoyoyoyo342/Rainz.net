// Aiven-backed edge function for saved_locations.
// GET    → list current user's locations (ordered: primary first, then name)
// POST   → { name, latitude, longitude, country?, state? } create (caps at 3)
// PATCH  → { id, action: "set_primary" }
// DELETE → ?id=<uuid>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

const MAX_LOCATIONS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);

    if (req.method === "GET") {
      const rows = await db`
        SELECT id, name, latitude, longitude, country, state, is_primary, created_at
        FROM saved_locations
        WHERE user_id = ${user.id}
        ORDER BY is_primary DESC, name ASC
      `;
      return json({ data: rows });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { name, latitude, longitude, country = null, state = null } = body ?? {};
      if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
        return json({ error: "name, latitude, longitude required" }, 400);
      }

      const [{ count }] = await db`
        SELECT count(*)::int AS count FROM saved_locations WHERE user_id = ${user.id}
      `;
      if (count >= MAX_LOCATIONS) return json({ error: "MAX_REACHED" }, 409);

      const rows = await db`
        INSERT INTO saved_locations (user_id, name, latitude, longitude, country, state, is_primary)
        VALUES (${user.id}, ${name}, ${latitude}, ${longitude}, ${country}, ${state}, ${count === 0})
        RETURNING *
      `;
      return json({ data: rows[0] });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, action } = body ?? {};
      if (!id) return json({ error: "id required" }, 400);

      if (action === "set_primary") {
        await db.begin(async (tx) => {
          await tx`UPDATE saved_locations SET is_primary = false WHERE user_id = ${user.id}`;
          await tx`UPDATE saved_locations SET is_primary = true WHERE id = ${id} AND user_id = ${user.id}`;
        });
        return json({ data: { id, is_primary: true } });
      }
      return json({ error: "unknown action" }, 400);
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required" }, 400);
      await db`DELETE FROM saved_locations WHERE id = ${id} AND user_id = ${user.id}`;
      return json({ data: { id } });
    }

    return json({ error: `Method ${req.method} not allowed` }, 405);
  } catch (e) {
    console.error("[saved-locations]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
