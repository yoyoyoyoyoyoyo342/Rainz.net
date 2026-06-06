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
        const { data, error } = await supabase.functions.invoke("user-streaks", {
          method: "POST",
        });
        if (error) throw error;
        const row = data?.data;
        if (!row) return;
        setStreakData({
          currentStreak: row.current_streak,
          longestStreak: row.longest_streak,
          totalVisits: row.total_visits,
          lastVisitDate: row.last_visit_date,
          streakFreezesUsed: row.streak_freezes_used ?? 0,
        });

        if (data?.event === "incremented" && row.current_streak > 1) {
          toast.success(`🔥 ${row.current_streak} day streak! +${data.bonus_awarded} points`);
        } else if (data?.event === "freeze_used") {
          const n = data.missed_days ?? 1;
          toast.success(
            `❄️ Streak Freeze used! ${n} day${n > 1 ? "s" : ""} covered. Your streak continues!`,
            { duration: 5000 }
          );
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
