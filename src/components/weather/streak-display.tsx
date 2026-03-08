import { Flame, Trophy, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useUserStreaks } from "@/hooks/use-user-streaks";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StreakDisplay = () => {
  const { t } = useLanguage();
  const { streakData, loading } = useUserStreaks();

  if (loading) {
    return (
      <Card className="p-4 bg-background/40 backdrop-blur-md border-border/50">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </Card>
    );
  }

  if (!streakData) return null;

  const { currentStreak, longestStreak, totalVisits } = streakData;

  return (
    <Card className="p-4 bg-background/40 backdrop-blur-md border-border/50 hover:bg-background/50 transition-colors">
      <div className="flex items-center justify-between gap-6">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative bg-primary/10 p-2.5 rounded-full">
              <Flame className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {currentStreak}
              </span>
              <span className="text-sm text-muted-foreground">
                {currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30">
          <Trophy className="h-4 w-4 text-accent-foreground/70" />
          <div className="text-xs">
            <span className="font-semibold text-accent-foreground">
              {longestStreak}
            </span>
            <span className="text-accent-foreground/70 ml-1">best</span>
          </div>
        </div>

        {/* Total Visits */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30">
          <Calendar className="h-4 w-4 text-secondary-foreground/70" />
          <div className="text-xs">
            <span className="font-semibold text-secondary-foreground">
              {totalVisits}
            </span>
            <span className="text-secondary-foreground/70 ml-1">
              {totalVisits === 1 ? "visit" : "visits"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
