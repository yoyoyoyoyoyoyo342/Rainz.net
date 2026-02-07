import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Star, Snowflake, Lock, Check, Sparkles, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface CalendarDay {
  id: string;
  day_number: number;
  reward_type: string;
  reward_amount: number;
  unlock_date: string;
}

interface ClaimedDay {
  calendar_id: string;
  claimed_at: string;
}

const rewardIcons: Record<string, React.ReactNode> = {
  shop_points: <Star className="w-5 h-5 text-yellow-400" />,
  prediction_points: <Sparkles className="w-5 h-5 text-purple-400" />,
  streak_freeze: <Snowflake className="w-5 h-5 text-blue-400" />,
  double_points: <span className="text-lg font-bold text-green-400">2x</span>,
  mystery_box: <Gift className="w-5 h-5 text-pink-400" />,
  xp_boost: <span className="text-lg font-bold text-orange-400">XP</span>,
};

const rewardLabels: Record<string, string> = {
  shop_points: "Shop Points",
  prediction_points: "Prediction Points",
  streak_freeze: "Streak Freeze",
  double_points: "Double Points",
  mystery_box: "Mystery Box",
  xp_boost: "XP Boost",
};

export function ChristmasCalendar() {
  const { user } = useAuth();
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [claimedDays, setClaimedDays] = useState<ClaimedDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const today = new Date();
  const isDecember = today.getMonth() === 11; // December is month 11 (0-indexed)
  const currentDay = today.getDate();

  // Check if it's Christmas season (December 1-25)
  const isChristmasSeason = isDecember && currentDay >= 1 && currentDay <= 25;

  useEffect(() => {
    loadCalendarData();
  }, [user]);

  const loadCalendarData = async () => {
    try {
      // Load calendar days for current year
      const { data: days, error: daysError } = await supabase
        .from("christmas_calendar")
        .select("*")
        .eq("year", currentYear)
        .order("day_number");

      if (daysError) throw daysError;
      setCalendarDays(days || []);

      // Load claimed days for current user
      if (user) {
        const { data: claims, error: claimsError } = await supabase
          .from("christmas_claims")
          .select("calendar_id, claimed_at")
          .eq("user_id", user.id);

        if (claimsError) throw claimsError;
        setClaimedDays(claims || []);
      }
    } catch (error) {
      console.error("Error loading Christmas calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDayUnlocked = (day: CalendarDay) => {
    if (!isDecember) return false;
    return currentDay >= day.day_number;
  };

  const isDayClaimed = (day: CalendarDay) => {
    return claimedDays.some((c) => c.calendar_id === day.id);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!user) {
      toast.error("Please sign in to claim rewards");
      return;
    }

    if (!isDayUnlocked(day)) {
      toast.error(`This reward unlocks on December ${day.day_number}`);
      return;
    }

    if (isDayClaimed(day)) {
      toast.info("You've already claimed this reward!");
      return;
    }

    setSelectedDay(day);
    setIsClaimDialogOpen(true);
  };

  const handleClaimReward = async () => {
    if (!selectedDay || !user) return;

    setIsClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-christmas-reward", {
        body: { calendarId: selectedDay.id },
      });

      if (error) throw error;

      // Trigger confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ff0000", "#00ff00", "#ffffff", "#gold"],
      });

      toast.success(`🎄 ${data.message || "Reward claimed!"}`);
      
      // Update local state
      setClaimedDays([...claimedDays, { calendar_id: selectedDay.id, claimed_at: new Date().toISOString() }]);
      setIsClaimDialogOpen(false);
    } catch (error: any) {
      console.error("Error claiming reward:", error);
      toast.error(error.message || "Failed to claim reward");
    } finally {
      setIsClaiming(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-green-500/20">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full" />
            <div className="h-4 w-32 bg-green-500/20 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if no calendar data or not December
  if (calendarDays.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-card border-green-500/30 bg-gradient-to-br from-green-950/30 to-red-950/30 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Calendar className="w-5 h-5" />
            Christmas Advent Calendar
            <span className="text-xs text-muted-foreground ml-auto">Dec 1-25</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {calendarDays.map((day) => {
              const unlocked = isDayUnlocked(day);
              const claimed = isDayClaimed(day);
              const isToday = isDecember && currentDay === day.day_number;

              return (
                <button
                  key={day.id}
                  onClick={() => handleDayClick(day)}
                  disabled={!unlocked && !claimed}
                  className={`
                    relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${isToday ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : ""}
                    ${claimed 
                      ? "bg-green-500/30 border border-green-500/50" 
                      : unlocked 
                        ? "bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 cursor-pointer" 
                        : "bg-muted/20 border border-muted/30 cursor-not-allowed opacity-50"
                    }
                  `}
                >
                  <span className="text-xs font-bold text-muted-foreground">{day.day_number}</span>
                  {claimed ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : unlocked ? (
                    rewardIcons[day.reward_type] || <Gift className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                  {isToday && !claimed && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {!isChristmasSeason && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              🎄 The Christmas Calendar opens December 1st!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-red-400" />
              December {selectedDay?.day_number} Reward
            </DialogTitle>
            <DialogDescription>
              Open your Christmas calendar gift!
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-gradient-to-br from-red-500/20 to-green-500/20 rounded-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎁</div>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                    {rewardIcons[selectedDay.reward_type]}
                    <span>{selectedDay.reward_amount}x {rewardLabels[selectedDay.reward_type]}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClaimReward} 
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600"
              >
                {isClaiming ? "Claiming..." : "🎄 Claim Reward"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
