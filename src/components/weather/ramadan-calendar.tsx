import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Star, Moon, Lock, Check, Sparkles, MapPin, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
  sunriseIso?: string;
  sunsetIso?: string;
}

export function RamadanCalendar({ userLatitude, userLongitude, sunriseIso, sunsetIso }: RamadanCalendarProps) {
  const { user } = useAuth();
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [claimedDays, setClaimedDays] = useState<ClaimedDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canClaimNow, setCanClaimNow] = useState(false);

  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Calculate if sun is down using ISO strings
  useEffect(() => {
    if (!sunriseIso || !sunsetIso) {
      setCanClaimNow(true);
      return;
    }

    const checkSunPosition = () => {
      const now = Date.now();
      const sunriseMs = new Date(sunriseIso).getTime();
      const sunsetMs = new Date(sunsetIso).getTime();

      if (isNaN(sunriseMs) || isNaN(sunsetMs)) {
        setCanClaimNow(true);
        return;
      }

      const isSunDown = now < sunriseMs || now > sunsetMs;
      setCanClaimNow(isSunDown);
    };

    checkSunPosition();
    const interval = setInterval(checkSunPosition, 60000);
    return () => clearInterval(interval);
  }, [sunriseIso, sunsetIso]);

  useEffect(() => {
    loadCalendarData();
  }, [user]);

  const loadCalendarData = async () => {
    try {
      const { data: days, error: daysError } = await supabase
        .from("ramadan_calendar")
        .select("*")
        .gte("year", currentYear)
        .lte("year", currentYear + 1)
        .order("day_number");

      if (daysError) throw daysError;
      setCalendarDays(days || []);

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

  const isDayUnlocked = (day: CalendarDay) => todayStr >= day.gregorian_start_date;
  const isDayClaimed = (day: CalendarDay) => claimedDays.some((c) => c.calendar_id === day.id);
  const isToday = (day: CalendarDay) => todayStr === day.gregorian_start_date;

  const isRamadanPeriod = () => {
    if (calendarDays.length === 0) return false;
    const firstDay = calendarDays[0];
    const lastDay = calendarDays[calendarDays.length - 1];
    return todayStr >= firstDay.gregorian_start_date && todayStr <= lastDay.gregorian_end_date;
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!user) { toast.error("Please sign in to claim rewards"); return; }
    if (!isDayUnlocked(day)) { toast.error("This day hasn't arrived yet"); return; }
    if (isDayClaimed(day)) { toast.info("You've already claimed this reward!"); return; }
    if (!isToday(day)) { toast.error("You can only claim rewards on the current day"); return; }
    setSelectedDay(day);
    setIsClaimDialogOpen(true);
  };

  // Direct client-side claim logic — no edge function needed
  const handleClaimReward = async () => {
    if (!selectedDay || !user) return;

    if (!canClaimNow) {
      toast.error("You can only claim rewards after sunset (Iftar) or before sunrise (Suhoor)");
      return;
    }

    setIsClaiming(true);
    try {
      // 1. Check if already claimed (double-check)
      const { data: existingClaim } = await supabase
        .from("ramadan_claims")
        .select("id")
        .eq("user_id", user.id)
        .eq("calendar_id", selectedDay.id)
        .maybeSingle();

      if (existingClaim) {
        toast.info("You've already claimed this reward!");
        setIsClaimDialogOpen(false);
        return;
      }

      // 2. Insert the claim
      const { error: claimError } = await supabase
        .from("ramadan_claims")
        .insert({
          user_id: user.id,
          calendar_id: selectedDay.id,
          user_latitude: userLatitude || null,
          user_longitude: userLongitude || null,
        });

      if (claimError) throw claimError;

      // 3. Award the reward based on type
      const { reward_type, reward_amount } = selectedDay;

      if (reward_type === "shop_points") {
        // Get current shop_points and add
        const { data: profile } = await supabase
          .from("profiles")
          .select("shop_points")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ shop_points: (profile.shop_points || 0) + reward_amount })
            .eq("user_id", user.id);
        }
      } else if (reward_type === "prediction_points") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ total_points: (profile.total_points || 0) + reward_amount })
            .eq("user_id", user.id);
        }
      } else if (reward_type === "streak_freeze" || reward_type === "double_points" || reward_type === "xp_boost") {
        // Insert into active_powerups
        await supabase.from("active_powerups").insert({
          user_id: user.id,
          powerup_type: reward_type,
          uses_remaining: reward_amount,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });
      } else if (reward_type === "mystery_box") {
        // Mystery box gives random shop points (5-25)
        const randomPoints = Math.floor(Math.random() * 21) + 5;
        const { data: profile } = await supabase
          .from("profiles")
          .select("shop_points")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ shop_points: (profile.shop_points || 0) + randomPoints })
            .eq("user_id", user.id);
        }
        toast.success(`🎁 Mystery Box: You got ${randomPoints} Shop Points!`);
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#FFD700", "#C0C0C0", "#1a237e", "#4a148c"] });
      toast.success("☪️ Ramadan Mubarak! Reward claimed!");
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

  if (calendarDays.length === 0) return null;

  return (
    <>
      <Card className="glass-card border-purple-500/30 overflow-hidden">
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
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            canClaimNow ? "bg-green-500/20 border border-green-500/30" : "bg-yellow-500/20 border border-yellow-500/30"
          }`}>
            {canClaimNow ? (
              <><Moon className="w-4 h-4 text-purple-400" /><span className="text-sm">Sun is down — You can claim rewards!</span></>
            ) : (
              <><AlertCircle className="w-4 h-4 text-yellow-400" /><span className="text-sm">Wait until after sunset (Iftar) or before sunrise (Suhoor)</span></>
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
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${isTodayDay ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : ""}
                    ${claimed ? "bg-purple-500/30 border border-purple-500/50"
                      : unlocked && isTodayDay ? "bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 cursor-pointer"
                      : unlocked ? "bg-muted/30 border border-muted/40 cursor-not-allowed"
                      : "bg-muted/20 border border-muted/30 cursor-not-allowed opacity-50"}`}
                >
                  <span className="text-xs font-bold text-muted-foreground">{day.day_number}</span>
                  {claimed ? <Check className="w-4 h-4 text-purple-400" />
                    : unlocked ? (rewardIcons[day.reward_type] || <Gift className="w-4 h-4" />)
                    : <Lock className="w-3 h-3 text-muted-foreground" />}
                  {isTodayDay && !claimed && canClaimNow && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {!isRamadanPeriod() && (
            <p className="text-xs text-muted-foreground mt-4 text-center">☪️ The Ramadan Calendar will be available during Ramadan</p>
          )}
          {!userLatitude && (
            <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg flex items-center gap-2 text-xs text-yellow-500">
              <MapPin className="w-3 h-3" />Location required to verify sun position
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-400" />
              Day {selectedDay?.day_number} of Ramadan
            </DialogTitle>
            <DialogDescription>
              {canClaimNow ? "Ramadan Mubarak! Claim your reward." : "You can only claim during Iftar or Suhoor time."}
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
                  <AlertCircle className="w-4 h-4" />Wait until sun sets to claim
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
