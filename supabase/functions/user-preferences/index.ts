// Aiven-backed edge function for user_preferences (pilot for the full migration).
// GET    → fetch current user's row
// PUT    → upsert current user's row (whole record, scoped to user_id)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

interface Prefs {
  visible_cards?: unknown;
  card_order?: unknown;
  is_24_hour?: boolean;
  is_high_contrast?: boolean;
  saved_address?: string | null;
  saved_latitude?: number | null;
  saved_longitude?: number | null;
  seen_whatsnew_2?: boolean;
  vision_prefs?: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (req.method === "GET") {
      const rows = await db`
        SELECT user_id, visible_cards, card_order, is_24_hour, is_high_contrast,
               saved_address, saved_latitude, saved_longitude, seen_whatsnew_2,
               vision_prefs
        FROM user_preferences
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      return json({ data: rows[0] ?? null });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = (await req.json()) as Prefs;
      const rows = await db`
        INSERT INTO user_preferences (
          user_id, visible_cards, card_order, is_24_hour, is_high_contrast,
          saved_address, saved_latitude, saved_longitude, seen_whatsnew_2,
          vision_prefs
        ) VALUES (
          ${user.id},
          ${db.json(body.visible_cards ?? {})},
          ${db.json(body.card_order ?? [])},
          ${body.is_24_hour ?? true},
          ${body.is_high_contrast ?? false},
          ${body.saved_address ?? null},
          ${body.saved_latitude ?? null},
          ${body.saved_longitude ?? null},
          ${body.seen_whatsnew_2 ?? false},
          ${body.vision_prefs === undefined ? null : db.json(body.vision_prefs)}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          visible_cards     = COALESCE(EXCLUDED.visible_cards,     user_preferences.visible_cards),
          card_order        = COALESCE(EXCLUDED.card_order,        user_preferences.card_order),
          is_24_hour        = COALESCE(EXCLUDED.is_24_hour,        user_preferences.is_24_hour),
          is_high_contrast  = COALESCE(EXCLUDED.is_high_contrast,  user_preferences.is_high_contrast),
          saved_address     = COALESCE(EXCLUDED.saved_address,     user_preferences.saved_address),
          saved_latitude    = COALESCE(EXCLUDED.saved_latitude,    user_preferences.saved_latitude),
          saved_longitude   = COALESCE(EXCLUDED.saved_longitude,   user_preferences.saved_longitude),
          seen_whatsnew_2   = COALESCE(EXCLUDED.seen_whatsnew_2,   user_preferences.seen_whatsnew_2),
          vision_prefs      = COALESCE(EXCLUDED.vision_prefs,      user_preferences.vision_prefs),
          updated_at        = now()
        RETURNING *
      `;
      return json({ data: rows[0] ?? null });
    }

    return json({ error: `Method ${req.method} not allowed` }, 405);
  } catch (e) {
    console.error("[user-preferences]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
