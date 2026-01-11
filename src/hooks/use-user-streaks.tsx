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
        // Fetch existing streak data
        const { data: existingStreak, error: fetchError } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        const today = new Date().toISOString().split("T")[0];

        if (!existingStreak) {
          // First time user - create streak record
          const { data: newStreak, error: insertError } = await supabase
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

          if (insertError) throw insertError;

          setStreakData({
            currentStreak: newStreak.current_streak,
            longestStreak: newStreak.longest_streak,
            totalVisits: newStreak.total_visits,
            lastVisitDate: newStreak.last_visit_date,
            streakFreezesUsed: newStreak.streak_freezes_used || 0,
          });
        } else {
          const lastVisit = existingStreak.last_visit_date;
          
          if (lastVisit === today) {
            // Already visited today - just load data
            setStreakData({
              currentStreak: existingStreak.current_streak,
              longestStreak: existingStreak.longest_streak,
              totalVisits: existingStreak.total_visits,
              lastVisitDate: existingStreak.last_visit_date,
              streakFreezesUsed: existingStreak.streak_freezes_used || 0,
            });
          } else {
            // Calculate if streak continues
            const lastDate = new Date(lastVisit);
            const currentDate = new Date(today);
            const diffDays = Math.floor(
              (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            let newCurrentStreak: number;
            let showToast = false;
            let usedFreeze = false;
            let newStreakFreezesUsed = existingStreak.streak_freezes_used || 0;

            if (diffDays === 1) {
              // Consecutive day - increment streak
              newCurrentStreak = existingStreak.current_streak + 1;
              showToast = true;
              
              // Award +25 streak bonus points
              const { data: profile } = await supabase
                .from("profiles")
                .select("total_points")
                .eq("user_id", user.id)
                .single();
              
              await supabase
                .from("profiles")
                .update({ total_points: (profile?.total_points || 0) + 25 })
                .eq("user_id", user.id);
            } else if (diffDays > 1) {
              // Missed day(s) - check for streak freezes
              const missedDays = diffDays - 1;
              
              // Check if user has streak freezes
              const { data: inventoryData } = await supabase
                .from("user_inventory")
                .select("quantity")
                .eq("user_id", user.id)
                .eq("item_type", "streak_freeze")
                .single();

              const availableFreezes = inventoryData?.quantity || 0;

              if (availableFreezes > 0 && missedDays <= availableFreezes) {
                // Use streak freezes to cover missed days
                usedFreeze = true;
                newCurrentStreak = existingStreak.current_streak + 1; // Continue streak
                showToast = true;
                newStreakFreezesUsed += missedDays;

                // Deduct used freezes from inventory
                const { error: freezeError } = await supabase
                  .from("user_inventory")
                  .update({ quantity: availableFreezes - missedDays })
                  .eq("user_id", user.id)
                  .eq("item_type", "streak_freeze");

                if (freezeError) {
                  console.error("Error using streak freeze:", freezeError);
                }

                // Award streak bonus since streak was preserved
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("total_points")
                  .eq("user_id", user.id)
                  .single();
                
                await supabase
                  .from("profiles")
                  .update({ total_points: (profile?.total_points || 0) + 25 })
                  .eq("user_id", user.id);

                toast.success(
                  `❄️ Streak Freeze used! ${missedDays} day${missedDays > 1 ? "s" : ""} covered. Your streak continues!`,
                  { duration: 5000 }
                );
              } else if (availableFreezes > 0 && missedDays > availableFreezes) {
                // Not enough freezes - use what we have but still reset streak
                // This covers the edge case of missing many days
                newCurrentStreak = 1;
              } else {
                // No freezes available - streak broken
                newCurrentStreak = 1;
              }
            } else {
              newCurrentStreak = existingStreak.current_streak;
            }

            const newLongestStreak = Math.max(
              existingStreak.longest_streak,
              newCurrentStreak
            );
            const newTotalVisits = existingStreak.total_visits + 1;

            // Update streak
            const { data: updatedStreak, error: updateError } = await supabase
              .from("user_streaks")
              .update({
                current_streak: newCurrentStreak,
                longest_streak: newLongestStreak,
                last_visit_date: today,
                total_visits: newTotalVisits,
                streak_freezes_used: newStreakFreezesUsed,
              })
              .eq("user_id", user.id)
              .select()
              .single();

            if (updateError) throw updateError;

            setStreakData({
              currentStreak: updatedStreak.current_streak,
              longestStreak: updatedStreak.longest_streak,
              totalVisits: updatedStreak.total_visits,
              lastVisitDate: updatedStreak.last_visit_date,
              streakFreezesUsed: updatedStreak.streak_freezes_used || 0,
            });

            if (showToast && newCurrentStreak > 1 && !usedFreeze) {
              toast.success(`🔥 ${newCurrentStreak} day streak! +25 points`);
            }
          }
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
