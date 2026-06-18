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
        const today = new Date().toISOString().split("T")[0];

        const { data: existing } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const setFromRow = (row: any) => {
          setStreakData({
            currentStreak: row.current_streak,
            longestStreak: row.longest_streak,
            totalVisits: row.total_visits,
            lastVisitDate: row.last_visit_date,
            streakFreezesUsed: row.streak_freezes_used ?? 0,
          });
        };

        if (!existing) {
          const { data: inserted } = await supabase
            .from("user_streaks")
            .insert({
              user_id: user.id,
              current_streak: 1,
              longest_streak: 1,
              last_visit_date: today,
              total_visits: 1,
              streak_freezes_used: 0,
            })
            .select()
            .single();
          if (inserted) setFromRow(inserted);
          return;
        }

        // Show current data immediately so UI never sits at 0
        setFromRow(existing);

        if (existing.last_visit_date === today) return;

        const lastDate = new Date(existing.last_visit_date);
        const currentDate = new Date(today);
        const diffDays = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let newCurrentStreak = existing.current_streak;
        let event: "incremented" | "broken" | "same" = "same";

        if (diffDays === 1) {
          newCurrentStreak = existing.current_streak + 1;
          event = "incremented";
        } else if (diffDays > 1) {
          newCurrentStreak = 1;
          event = "broken";
        }

        const newLongest = Math.max(existing.longest_streak, newCurrentStreak);

        const { data: updated } = await supabase
          .from("user_streaks")
          .update({
            current_streak: newCurrentStreak,
            longest_streak: newLongest,
            last_visit_date: today,
            total_visits: existing.total_visits + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()
          .single();

        if (updated) setFromRow(updated);

        if (event === "incremented" && newCurrentStreak > 1) {
          await supabase.rpc as any;
          // Award streak bonus points
          const { data: prof } = await supabase
            .from("profiles")
            .select("total_points")
            .eq("user_id", user.id)
            .maybeSingle();
          if (prof) {
            await supabase
              .from("profiles")
              .update({ total_points: (prof.total_points ?? 0) + STREAK_BONUS })
              .eq("user_id", user.id);
          }
          toast.success(`🔥 ${newCurrentStreak} day streak! +${STREAK_BONUS} points`);
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
