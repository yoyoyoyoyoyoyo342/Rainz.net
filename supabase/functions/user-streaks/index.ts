// Aiven-backed edge function for user_streaks.
// GET   → current streak data for the user
// POST  → check-in: handles consecutive day increment, streak freeze consumption,
//         streak bonus points to profiles.total_points
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import db from "../_shared/db.ts";
import { getAuthUser, corsHeaders, json } from "../_shared/auth.ts";

const STREAK_BONUS = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (req.method === "GET") {
      const rows = await db`
        SELECT current_streak, longest_streak, total_visits, last_visit_date,
               COALESCE(streak_freezes_used, 0) AS streak_freezes_used
        FROM user_streaks WHERE user_id = ${user.id} LIMIT 1
      `;
      return json({ data: rows[0] ?? null });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const today = new Date().toISOString().split("T")[0];
    const existing = (await db`
      SELECT * FROM user_streaks WHERE user_id = ${user.id} LIMIT 1
    `)[0];

    if (!existing) {
      const [row] = await db`
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_visit_date, total_visits, streak_freezes_used)
        VALUES (${user.id}, 1, 1, ${today}, 1, 0)
        RETURNING *
      `;
      return json({ data: row, event: "created" });
    }

    if (existing.last_visit_date === today) {
      return json({ data: existing, event: "already_checked_in" });
    }

    const lastDate = new Date(existing.last_visit_date);
    const currentDate = new Date(today);
    const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak = existing.current_streak;
    let usedFreeze = false;
    let freezesUsedDelta = 0;
    let event: "incremented" | "freeze_used" | "broken" | "same" = "same";

    if (diffDays === 1) {
      newCurrentStreak = existing.current_streak + 1;
      event = "incremented";
    } else if (diffDays > 1) {
      const missedDays = diffDays - 1;
      const inv = (await db`
        SELECT COALESCE(quantity, 0) AS quantity FROM user_inventory
        WHERE user_id = ${user.id} AND item_type = 'streak_freeze' LIMIT 1
      `)[0];
      const available = inv?.quantity ?? 0;
      if (available > 0 && missedDays <= available) {
        usedFreeze = true;
        newCurrentStreak = existing.current_streak + 1;
        freezesUsedDelta = missedDays;
        event = "freeze_used";
        await db`
          UPDATE user_inventory SET quantity = ${available - missedDays}
          WHERE user_id = ${user.id} AND item_type = 'streak_freeze'
        `;
      } else {
        newCurrentStreak = 1;
        event = "broken";
      }
    }

    const newLongest = Math.max(existing.longest_streak, newCurrentStreak);
    const newTotalVisits = existing.total_visits + 1;
    const newFreezesUsed = (existing.streak_freezes_used ?? 0) + freezesUsedDelta;

    const [updated] = await db`
      UPDATE user_streaks SET
        current_streak = ${newCurrentStreak},
        longest_streak = ${newLongest},
        last_visit_date = ${today},
        total_visits = ${newTotalVisits},
        streak_freezes_used = ${newFreezesUsed},
        updated_at = now()
      WHERE user_id = ${user.id}
      RETURNING *
    `;

    if (event === "incremented" || event === "freeze_used") {
      await db`
        UPDATE profiles SET total_points = COALESCE(total_points, 0) + ${STREAK_BONUS}
        WHERE user_id = ${user.id}
      `;
    }

    return json({
      data: updated,
      event,
      bonus_awarded: event === "incremented" || event === "freeze_used" ? STREAK_BONUS : 0,
      used_freeze: usedFreeze,
      missed_days: diffDays > 1 ? diffDays - 1 : 0,
    });
  } catch (e) {
    console.error("[user-streaks]", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
