import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Star, Moon, Lock, Check, Sparkles, MapPin, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { weatherApi } from "@/lib/weather-api";

interface CalendarDay {
  id: string;
  day_number: number;
  reward_type: string;
  reward_amount: number;
  gregorian_start_date: string;
  gregorian_end_date: string;
}

interface ClaimedDay {
  calendar_id: string;
  claimed_at: string;
}

const rewardIcons: Record<string, React.ReactNode> = {
  shop_points: <Star className="w-5 h-5 text-yellow-400" />,
  prediction_points: <Sparkles className="w-5 h-5 text-purple-400" />,
  streak_freeze: <Moon className="w-5 h-5 text-blue-400" />,
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

interface RamadanCalendarProps {
  userLatitude?: number;
  userLongitude?: number;
  sunrise?: string;
  sunset?: string;
}

export function RamadanCalendar({ userLatitude, userLongitude, sunrise, sunset }: RamadanCalendarProps) {
  const { user } = useAuth();
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [claimedDays, setClaimedDays] = useState<ClaimedDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canClaimNow, setCanClaimNow] = useState(false);
  const [sunStatus, setSunStatus] = useState<"up" | "down" | "unknown">("unknown");

  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Calculate if sun is down (before sunrise or after sunset)
  useEffect(() => {
    if (!sunrise || !sunset) {
      setSunStatus("unknown");
      setCanClaimNow(false);
      return;
    }

    const checkSunPosition = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Robust time parser that handles:
      // "6:45 AM", "06:45 am", "6:45", "18:45" (24h), "6:45:00 AM"
      const parseTime = (timeStr: string): number => {
        // Strip seconds if present: "6:45:00 AM" -> "6:45 AM"
        const cleaned = timeStr.replace(/:\d{2}(\s*(AM|PM))?$/i, (m, suf) => suf || '').trim();

        // Try 12h with AM/PM
        const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match12) {
          let hours = parseInt(match12[1]);
          const minutes = parseInt(match12[2]);
          const period = match12[3].toUpperCase();
          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          return hours * 60 + minutes;
        }

        // Try 24h / no period
        const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
          return parseInt(match24[1]) * 60 + parseInt(match24[2]);
        }

        return -1; // unparseable
      };

      const sunriseMinutes = parseTime(sunrise);
      const sunsetMinutes = parseTime(sunset);

      if (sunriseMinutes < 0 || sunsetMinutes < 0) {
        // Can't parse — allow claiming (edge function will do server-side verification)
        setSunStatus("unknown");
        setCanClaimNow(true);
        return;
      }

      // Sun is down if before sunrise or after sunset
      const isSunDown = currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes;
      setSunStatus(isSunDown ? "down" : "up");
      setCanClaimNow(isSunDown);
    };

    checkSunPosition();
    const interval = setInterval(checkSunPosition, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [sunrise, sunset]);

  useEffect(() => {
    loadCalendarData();
  }, [user]);

  const loadCalendarData = async () => {
    try {
      // Load calendar days for current year (and next year to catch Ramadan spanning years)
      const { data: days, error: daysError } = await supabase
        .from("ramadan_calendar")
        .select("*")
        .gte("year", currentYear)
        .lte("year", currentYear + 1)
        .order("day_number");

      if (daysError) throw daysError;
      setCalendarDays(days || []);

      // Load claimed days for current user
      if (user) {
        const { data: claims, error: claimsError } = await supabase
          .from("ramadan_claims")
          .select("calendar_id, claimed_at")
          .eq("user_id", user.id);

        if (claimsError) throw claimsError;
        setClaimedDays(claims || []);
      }
    } catch (error) {
      console.error("Error loading Ramadan calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDayUnlocked = (day: CalendarDay) => {
    // Day is unlocked if today is on or after the gregorian_start_date
    return todayStr >= day.gregorian_start_date;
  };

  const isDayClaimed = (day: CalendarDay) => {
    return claimedDays.some((c) => c.calendar_id === day.id);
  };

  const isToday = (day: CalendarDay) => {
    return todayStr === day.gregorian_start_date;
  };

  // Check if we're currently in Ramadan period
  const isRamadanPeriod = () => {
    if (calendarDays.length === 0) return false;
    const firstDay = calendarDays[0];
    const lastDay = calendarDays[calendarDays.length - 1];
    return todayStr >= firstDay.gregorian_start_date && todayStr <= lastDay.gregorian_end_date;
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!user) {
      toast.error("Please sign in to claim rewards");
      return;
    }

    if (!isDayUnlocked(day)) {
      toast.error("This day hasn't arrived yet");
      return;
    }

    if (isDayClaimed(day)) {
      toast.info("You've already claimed this reward!");
      return;
    }

    if (!isToday(day)) {
      toast.error("You can only claim rewards on the current day");
      return;
    }

    setSelectedDay(day);
    setIsClaimDialogOpen(true);
  };

  const handleClaimReward = async () => {
    if (!selectedDay || !user) return;

    if (!canClaimNow) {
      toast.error("You can only claim rewards after sunset (Iftar) or before sunrise (Suhoor)");
      return;
    }

    if (!userLatitude || !userLongitude) {
      toast.error("Location required to verify sun position");
      return;
    }

    setIsClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("You must be logged in to claim rewards");
      }

      const { data, error } = await supabase.functions.invoke("claim-ramadan-reward", {
        body: { 
          calendarId: selectedDay.id,
          latitude: userLatitude,
          longitude: userLongitude
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Extract actual error message from edge function response
        const actualMessage = (error as any)?.context?.json?.error || 
                              (error as any)?.message || 
                              "Failed to claim reward";
        throw new Error(actualMessage);
      }

      // Trigger special Ramadan confetti (moon and stars theme)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#C0C0C0", "#1a237e", "#4a148c"],
      });

      toast.success(`☪️ ${data.message || "Ramadan Mubarak! Reward claimed!"}`);
      
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
      <Card className="glass-card border-purple-500/20">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full" />
            <div className="h-4 w-32 bg-purple-500/20 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if no calendar data
  if (calendarDays.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-card border-purple-500/30 bg-gradient-to-br from-indigo-950/30 to-purple-950/30 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <Moon className="w-5 h-5" />
            Ramadan Calendar
            <span className="text-xs text-muted-foreground ml-auto">
              {canClaimNow ? "☪️ Claim Now!" : "🌅 Wait for sunset"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Sun status indicator */}
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            canClaimNow 
              ? "bg-green-500/20 border border-green-500/30" 
              : "bg-yellow-500/20 border border-yellow-500/30"
          }`}>
            {canClaimNow ? (
              <>
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Sun is down - You can claim rewards!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">Wait until after sunset (Iftar) or before sunrise (Suhoor)</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {calendarDays.map((day) => {
              const unlocked = isDayUnlocked(day);
              const claimed = isDayClaimed(day);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={day.id}
                  onClick={() => handleDayClick(day)}
                  disabled={!unlocked || claimed}
                  className={`
                    relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${isTodayDay ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : ""}
                    ${claimed 
                      ? "bg-purple-500/30 border border-purple-500/50" 
                      : unlocked && isTodayDay
                        ? "bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 cursor-pointer" 
                        : unlocked 
                          ? "bg-muted/30 border border-muted/40 cursor-not-allowed"
                          : "bg-muted/20 border border-muted/30 cursor-not-allowed opacity-50"
                    }
                  `}
                >
                  <span className="text-xs font-bold text-muted-foreground">{day.day_number}</span>
                  {claimed ? (
                    <Check className="w-4 h-4 text-purple-400" />
                  ) : unlocked ? (
                    rewardIcons[day.reward_type] || <Gift className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                  {isTodayDay && !claimed && canClaimNow && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {!isRamadanPeriod() && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              ☪️ The Ramadan Calendar will be available during Ramadan
            </p>
          )}

          {!userLatitude && (
            <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg flex items-center gap-2 text-xs text-yellow-500">
              <MapPin className="w-3 h-3" />
              Location required to verify sun position for claiming rewards
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-400" />
              Day {selectedDay?.day_number} of Ramadan
            </DialogTitle>
            <DialogDescription>
              {canClaimNow 
                ? "Ramadan Mubarak! Claim your reward."
                : "You can only claim during Iftar or Suhoor time."}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
                <div className="text-center">
                  <div className="text-4xl mb-2">☪️</div>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                    {rewardIcons[selectedDay.reward_type]}
                    <span>{selectedDay.reward_amount}x {rewardLabels[selectedDay.reward_type]}</span>
                  </div>
                </div>
              </div>

              {!canClaimNow && (
                <div className="p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Wait until sun sets to claim
                </div>
              )}

              <Button 
                onClick={handleClaimReward} 
                disabled={isClaiming || !canClaimNow}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {isClaiming ? "Claiming..." : canClaimNow ? "☪️ Claim Reward" : "Wait for Sunset"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
