import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  lastVisitDate: string;
  streakFreezesUsed: number;
}

const STREAK_BONUS = 25;

// Reads/writes go through the `user-streaks` Aiven edge function. The legacy
// path that hit `supabase.from('user_streaks')` was removed when the data
// moved to Aiven and the Supabase table was emptied.
export const useUserStreaks = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkAndUpdateStreak = async () => {
      try {
        // 1. Show whatever we already have so the UI never sits at 0.
        const { data: getRes } = await supabase.functions.invoke("user-streaks", { method: "GET" });
        if (getRes?.data) {
          setStreakData({
            currentStreak: getRes.data.current_streak ?? 0,
            longestStreak: getRes.data.longest_streak ?? 0,
            totalVisits: getRes.data.total_visits ?? 0,
            lastVisitDate: getRes.data.last_visit_date,
            streakFreezesUsed: getRes.data.streak_freezes_used ?? 0,
          });
        }
        setLoading(false);

        // 2. Check-in for today (server is the source of truth for diffing dates).
        const { data: postRes, error } = await supabase.functions.invoke("user-streaks", { method: "POST" });
        if (error) {
          console.warn("[use-user-streaks] check-in failed", error);
          return;
        }
        if (postRes?.data) {
          setStreakData({
            currentStreak: postRes.data.current_streak ?? 0,
            longestStreak: postRes.data.longest_streak ?? 0,
            totalVisits: postRes.data.total_visits ?? 0,
            lastVisitDate: postRes.data.last_visit_date,
            streakFreezesUsed: postRes.data.streak_freezes_used ?? 0,
          });
        }
        if (postRes?.event === "incremented" && (postRes?.data?.current_streak ?? 0) > 1) {
          toast.success(`🔥 ${postRes.data.current_streak} day streak! +${STREAK_BONUS} points`);
        } else if (postRes?.event === "freeze_used") {
          toast.success(`🧊 Streak freeze saved your streak (${postRes.missed_days} day${postRes.missed_days === 1 ? "" : "s"})`);
        }
      } catch (error) {
        console.error("Error managing streak:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAndUpdateStreak();
  }, [user]);

  return { streakData, loading };
};
