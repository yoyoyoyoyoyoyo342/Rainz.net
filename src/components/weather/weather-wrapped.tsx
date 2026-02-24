import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ChevronLeft, ChevronRight, Download, Share2, Trophy, Target, Flame, Brain, CloudSun, Zap, Swords, TrendingUp } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import rainzLogo from "@/assets/rainz-logo-new.png";

interface WrappedData {
  totalPredictions: number;
  verifiedPredictions: number;
  correctPredictions: number;
  accuracy: number;
  longestStreak: number;
  currentStreak: number;
  totalPoints: number;
  bestPrediction: { date: string; location: string; pointsEarned: number } | null;
  mostPredictedLocation: string;
  personalityType: { name: string; emoji: string; description: string };
  rank: number | null;
  memberSince: string;
  conditionBreakdown: Record<string, number>;
  // New fields
  battleWins: number;
  battleLosses: number;
  battleWinRate: number;
  topRival: string | null;
  confidenceBreakdown: { safe: number; confident: number; allIn: number };
  boldestCorrectMultiplier: number | null;
}

function getPersonality(data: { accuracy: number; totalPredictions: number; conditionBreakdown: Record<string, number> }): { name: string; emoji: string; description: string } {
  const { accuracy, totalPredictions, conditionBreakdown } = data;
  const conditions = Object.entries(conditionBreakdown).sort((a, b) => b[1] - a[1]);
  const topCondition = conditions[0]?.[0]?.toLowerCase() || "";

  if (accuracy >= 85 && totalPredictions >= 20) return { name: "Weather Oracle", emoji: "🔮", description: "Your predictions are nearly supernatural. You don't check the weather — the weather checks with you." };
  if (accuracy >= 70 && totalPredictions >= 30) return { name: "Storm Whisperer", emoji: "🌪️", description: "You've mastered the art of reading the sky. Meteorologists could learn from you." };
  if (topCondition.includes("sun") || topCondition.includes("clear")) return { name: "Sunshine Optimist", emoji: "☀️", description: "You see blue skies even when others see clouds. Your sunny disposition lights up the forecast." };
  if (topCondition.includes("rain") || topCondition.includes("storm")) return { name: "Rain Prophet", emoji: "🌧️", description: "You have a sixth sense for precipitation. Never leave home without an umbrella — or your wisdom." };
  if (topCondition.includes("snow")) return { name: "Frost Sage", emoji: "❄️", description: "You feel winter coming in your bones. Snow days don't surprise you — they answer to you." };
  if (totalPredictions >= 50) return { name: "Weather Warrior", emoji: "⚔️", description: "Quantity AND quality. You're not just predicting weather — you're living it." };
  if (accuracy >= 60) return { name: "Cloud Reader", emoji: "☁️", description: "You've got a solid read on Mother Nature. Keep honing your skills!" };
  return { name: "Weather Rookie", emoji: "🌤️", description: "Every expert was once a beginner. Your weather prediction journey has just begun!" };
}

function getRiskPersonality(breakdown: { safe: number; confident: number; allIn: number }): { name: string; emoji: string } {
  const total = breakdown.safe + breakdown.confident + breakdown.allIn;
  if (total === 0) return { name: "No Bets Yet", emoji: "🎲" };
  const allInRate = breakdown.allIn / total;
  const safeRate = breakdown.safe / total;
  if (allInRate >= 0.4) return { name: "Fearless Gambler", emoji: "🔥" };
  if (safeRate >= 0.6) return { name: "Cautious Player", emoji: "🛡️" };
  return { name: "Calculated Risk-Taker", emoji: "🎯" };
}

const SLIDE_DURATION = 5000;
const RESUME_DELAY = 3000;

// Auto-advance progress bar
function SlideProgressBar({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const startTime = useRef<number | null>(null);
  const pausedAt = useRef<number>(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active) {
      setProgress(0);
      pausedAt.current = 0;
      startTime.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp - pausedAt.current;
      const elapsed = timestamp - startTime.current;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, onComplete]);

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    pausedAt.current = (progress / 100) * SLIDE_DURATION;
    startTime.current = null;
  }, [progress]);

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-20 rounded-t-2xl overflow-hidden" onPointerDown={pause}>
      <div className="h-full bg-white/80 transition-none" style={{ width: `${progress}%` }} />
    </div>
  );
}

function SlideWrapper({ children, slideRef, gradient }: { children: React.ReactNode; slideRef?: React.Ref<HTMLDivElement>; gradient: string }) {
  return (
    <div ref={slideRef} className={`relative w-full aspect-[9/16] max-h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        {children}
      </div>
    </div>
  );
}

function IntroSlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  return (
    <SlideWrapper slideRef={slideRef} gradient="from-indigo-600 via-purple-600 to-pink-500">
      <div>
        <img src={rainzLogo} alt="Rainz" className="h-8 mb-4 brightness-0 invert" />
        <Badge className="bg-white/20 text-white border-0 mb-3">Your Weather Wrapped</Badge>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center text-center gap-4">
        <div className="text-6xl">{data.personalityType.emoji}</div>
        <h2 className="text-3xl font-bold text-white">{data.personalityType.name}</h2>
        <p className="text-white/80 text-sm max-w-xs">{data.personalityType.description}</p>
      </div>
      <p className="text-white/50 text-xs text-center">Member since {data.memberSince}</p>
    </SlideWrapper>
  );
}

function StatsSlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  // Top 3 conditions breakdown
  const sortedConditions = Object.entries(data.conditionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const totalConditions = Object.values(data.conditionBreakdown).reduce((a, b) => a + b, 0);

  const conditionLabels: Record<string, string> = {
    sunny: "☀️ Sunny", "partly-cloudy": "⛅ Partly Cloudy", cloudy: "☁️ Cloudy",
    rainy: "🌧️ Rainy", "heavy-rain": "🌧️ Heavy Rain", snowy: "❄️ Snowy",
    "heavy-snow": "❄️ Heavy Snow", thunderstorm: "⛈️ Thunderstorm", foggy: "🌫️ Foggy",
    drizzle: "🌦️ Drizzle", windy: "💨 Windy",
  };

  return (
    <SlideWrapper slideRef={slideRef} gradient="from-emerald-600 via-teal-600 to-cyan-500">
      <div><img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" /></div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <h3 className="text-white/70 text-sm uppercase tracking-widest">Your Numbers</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-white">
            <span className="text-sm">Accuracy</span>
            <span className="text-2xl font-bold">{data.accuracy}%</span>
          </div>
          <Progress value={data.accuracy} className="h-2 bg-white/20" />
          <div className="flex justify-between text-white">
            <span className="text-sm">Total Points</span>
            <span className="text-2xl font-bold">{data.totalPoints.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-white">
            <span className="text-sm">Longest Streak</span>
            <span className="text-2xl font-bold">{data.longestStreak} days 🔥</span>
          </div>
        </div>
        {/* Condition breakdown */}
        {sortedConditions.length > 0 && (
          <div className="mt-2">
            <p className="text-white/60 text-xs mb-2 uppercase tracking-wide">Top Predictions</p>
            <div className="space-y-1.5">
              {sortedConditions.map(([condition, count]) => {
                const pct = totalConditions > 0 ? Math.round((count / totalConditions) * 100) : 0;
                return (
                  <div key={condition} className="flex items-center gap-2">
                    <span className="text-white text-xs w-28 truncate">{conditionLabels[condition] || condition}</span>
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-white/80 text-xs w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <p className="text-white/50 text-xs text-center">rainz.lovable.app</p>
    </SlideWrapper>
  );
}

function AccuracySlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  const ringPercent = data.accuracy;
  return (
    <SlideWrapper slideRef={slideRef} gradient="from-amber-500 via-orange-500 to-red-500">
      <div><img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" /></div>
      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        <h3 className="text-white/70 text-sm uppercase tracking-widest">Prediction Accuracy</h3>
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${ringPercent * 2.64} ${264 - ringPercent * 2.64}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{data.accuracy}%</span>
          </div>
        </div>
        <p className="text-white/80 text-center text-sm">{data.correctPredictions} correct out of {data.verifiedPredictions} verified</p>
        {data.bestPrediction && (
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-white/60 text-xs">Best Prediction</p>
            <p className="text-white font-semibold text-sm">{data.bestPrediction.location}</p>
            <p className="text-white/70 text-xs">+{data.bestPrediction.pointsEarned} pts on {data.bestPrediction.date}</p>
          </div>
        )}
      </div>
      <p className="text-white/50 text-xs text-center">rainz.lovable.app</p>
    </SlideWrapper>
  );
}

function RankSlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  return (
    <SlideWrapper slideRef={slideRef} gradient="from-violet-600 via-purple-600 to-fuchsia-500">
      <div><img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" /></div>
      <div className="flex-1 flex flex-col justify-center items-center gap-5 text-center">
        <Trophy className="w-16 h-16 text-amber-300" />
        <div>
          <h3 className="text-white/70 text-sm uppercase tracking-widest mb-2">Global Ranking</h3>
          {data.rank ? (
            <p className="text-5xl font-bold text-white">#{data.rank}</p>
          ) : (
            <p className="text-2xl font-bold text-white">Unranked</p>
          )}
        </div>
        <div className="bg-white/15 rounded-xl p-4 w-full max-w-xs">
          <p className="text-white font-semibold text-lg mb-1">{data.personalityType.emoji} {data.personalityType.name}</p>
          <p className="text-white/70 text-xs">{data.mostPredictedLocation && `Most predicted: ${data.mostPredictedLocation}`}</p>
        </div>
        <p className="text-white/80 text-sm">Can you reach #1? Keep predicting!</p>
      </div>
      <p className="text-white/50 text-xs text-center">Join me on Rainz Weather</p>
    </SlideWrapper>
  );
}

function ConfidenceGamblerSlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  const { confidenceBreakdown, boldestCorrectMultiplier } = data;
  const total = confidenceBreakdown.safe + confidenceBreakdown.confident + confidenceBreakdown.allIn;
  const riskPersonality = getRiskPersonality(confidenceBreakdown);

  const bars = [
    { label: "Safe (1x)", count: confidenceBreakdown.safe, color: "bg-blue-300" },
    { label: "Confident (1.5x)", count: confidenceBreakdown.confident, color: "bg-indigo-300" },
    { label: "All-In (2.5x)", count: confidenceBreakdown.allIn, color: "bg-purple-300" },
  ];

  return (
    <SlideWrapper slideRef={slideRef} gradient="from-blue-600 via-indigo-600 to-indigo-800">
      <div><img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" /></div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <h3 className="text-white/70 text-sm uppercase tracking-widest">Confidence Gambler</h3>
        <div className="text-center">
          <span className="text-4xl">{riskPersonality.emoji}</span>
          <p className="text-white font-bold text-xl mt-1">{riskPersonality.name}</p>
        </div>
        <div className="space-y-2">
          {bars.map(bar => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-white text-xs w-28">{bar.label}</span>
              <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                <div className={`h-full ${bar.color} rounded-full`} style={{ width: total > 0 ? `${(bar.count / total) * 100}%` : "0%" }} />
              </div>
              <span className="text-white/80 text-xs w-6 text-right">{bar.count}</span>
            </div>
          ))}
        </div>
        {boldestCorrectMultiplier && (
          <div className="bg-white/15 rounded-xl p-3 text-center mt-2">
            <p className="text-white/60 text-xs">Boldest Correct Prediction</p>
            <p className="text-white font-bold text-lg">{boldestCorrectMultiplier}x multiplier ✅</p>
          </div>
        )}
      </div>
      <p className="text-white/50 text-xs text-center">rainz.lovable.app</p>
    </SlideWrapper>
  );
}

function BattleRecordSlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  const { battleWins, battleLosses, battleWinRate, topRival } = data;
  const totalBattles = battleWins + battleLosses;

  return (
    <SlideWrapper slideRef={slideRef} gradient="from-rose-500 via-red-500 to-red-700">
      <div><img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" /></div>
      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        <Swords className="w-12 h-12 text-white/90" />
        <h3 className="text-white/70 text-sm uppercase tracking-widest">Battle Record</h3>
        {totalBattles === 0 ? (
          <p className="text-white/80 text-sm text-center">No battles completed yet. Challenge someone!</p>
        ) : (
          <>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-green-300">{battleWins}</p>
                <p className="text-white/60 text-xs">Wins</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-300">{battleLosses}</p>
                <p className="text-white/60 text-xs">Losses</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{battleWinRate}%</p>
                <p className="text-white/60 text-xs">Win Rate</p>
              </div>
            </div>
            {topRival && (
              <div className="bg-white/15 rounded-xl p-3 text-center w-full max-w-xs">
                <p className="text-white/60 text-xs">Top Rival</p>
                <p className="text-white font-semibold">{topRival}</p>
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-white/50 text-xs text-center">rainz.lovable.app</p>
    </SlideWrapper>
  );
}

const TOTAL_SLIDES = 6;

export function WeatherWrapped() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRefs = Array.from({ length: TOTAL_SLIDES }, () => useRef<HTMLDivElement>(null));
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStart = useRef<number | null>(null);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    handleInteraction();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (delta > 50 && currentSlide > 0) setCurrentSlide(s => s - 1);
    else if (delta < -50 && currentSlide < TOTAL_SLIDES - 1) setCurrentSlide(s => s + 1);
  };

  const handleInteraction = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_DELAY);
  }, []);

  const handleAutoAdvance = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(s => s + 1);
    }
  }, [currentSlide]);

  const { data: wrappedData, isLoading } = useQuery<WrappedData | null>({
    queryKey: ["weather-wrapped", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      if (!user) return null;

      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("*")
        .eq("user_id", user.id)
        .order("points_earned", { ascending: false });

      if (!predictions || predictions.length === 0) return null;

      const verified = predictions.filter(p => p.is_verified);
      const correct = verified.filter(p => p.is_correct);
      const accuracy = verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : 0;

      const locationCounts: Record<string, number> = {};
      predictions.forEach(p => { locationCounts[p.location_name] = (locationCounts[p.location_name] || 0) + 1; });
      const mostPredictedLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      const conditionBreakdown: Record<string, number> = {};
      predictions.forEach(p => { conditionBreakdown[p.predicted_condition] = (conditionBreakdown[p.predicted_condition] || 0) + 1; });

      const best = predictions.find(p => p.points_earned && p.points_earned > 0);
      const bestPrediction = best ? {
        date: new Date(best.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        location: best.location_name,
        pointsEarned: best.points_earned || 0,
      } : null;

      const { data: streakData } = await supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle();
      const { data: profileData } = await supabase.from("profiles").select("total_points, created_at").eq("user_id", user.id).maybeSingle();

      // Rank by user_id
      const { data: leaderboard } = await supabase.rpc("get_leaderboard");
      let rank: number | null = null;
      if (leaderboard) {
        const entry = (leaderboard as any[]).find((l: any) => l.user_id === user.id);
        rank = entry ? Number(entry.rank) : null;
      }

      // Confidence breakdown
      const confidenceBreakdown = { safe: 0, confident: 0, allIn: 0 };
      let boldestCorrectMultiplier: number | null = null;
      predictions.forEach(p => {
        const m = p.confidence_multiplier ?? 1;
        if (m <= 1) confidenceBreakdown.safe++;
        else if (m <= 1.5) confidenceBreakdown.confident++;
        else confidenceBreakdown.allIn++;
        if (p.is_correct && m > (boldestCorrectMultiplier || 0)) boldestCorrectMultiplier = m;
      });

      // Battle data
      const { data: battles } = await supabase
        .from("prediction_battles")
        .select("winner_id, challenger_id, opponent_id, status")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq("status", "completed");

      let battleWins = 0, battleLosses = 0;
      const rivalCounts: Record<string, number> = {};
      (battles || []).forEach(b => {
        if (b.winner_id === user.id) battleWins++;
        else battleLosses++;
        const rivalId = b.challenger_id === user.id ? b.opponent_id : b.challenger_id;
        if (rivalId) rivalCounts[rivalId] = (rivalCounts[rivalId] || 0) + 1;
      });
      const battleTotal = battleWins + battleLosses;
      const battleWinRate = battleTotal > 0 ? Math.round((battleWins / battleTotal) * 100) : 0;

      // Top rival name
      let topRival: string | null = null;
      const topRivalId = Object.entries(rivalCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topRivalId) {
        const { data: rivalProfile } = await supabase.from("profiles").select("display_name").eq("user_id", topRivalId).maybeSingle();
        topRival = rivalProfile?.display_name || "Unknown";
      }

      const personalityType = getPersonality({ accuracy, totalPredictions: predictions.length, conditionBreakdown });

      return {
        totalPredictions: predictions.length,
        verifiedPredictions: verified.length,
        correctPredictions: correct.length,
        accuracy,
        longestStreak: streakData?.longest_streak || 0,
        currentStreak: streakData?.current_streak || 0,
        totalPoints: profileData?.total_points || 0,
        bestPrediction,
        mostPredictedLocation,
        personalityType,
        rank,
        memberSince: profileData ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "",
        conditionBreakdown,
        battleWins,
        battleLosses,
        battleWinRate,
        topRival,
        confidenceBreakdown,
        boldestCorrectMultiplier,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const slides = wrappedData ? [
    <IntroSlide key="intro" data={wrappedData} slideRef={slideRefs[0]} />,
    <StatsSlide key="stats" data={wrappedData} slideRef={slideRefs[1]} />,
    <AccuracySlide key="accuracy" data={wrappedData} slideRef={slideRefs[2]} />,
    <RankSlide key="rank" data={wrappedData} slideRef={slideRefs[3]} />,
    <ConfidenceGamblerSlide key="confidence" data={wrappedData} slideRef={slideRefs[4]} />,
    <BattleRecordSlide key="battle" data={wrappedData} slideRef={slideRefs[5]} />,
  ] : [];

  const handleDownload = async () => {
    const ref = slideRefs[currentSlide]?.current;
    if (!ref) return;
    try {
      const dataUrl = await toPng(ref, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `rainz-wrapped-${currentSlide + 1}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image saved!");
    } catch { toast.error("Failed to save image"); }
  };

  const handleShare = async () => {
    const ref = slideRefs[currentSlide]?.current;
    if (!ref) return;
    try {
      const dataUrl = await toPng(ref, { quality: 0.95, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "rainz-wrapped.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Rainz Weather Wrapped", text: "Check out my weather prediction stats!" });
      } else { handleDownload(); }
    } catch { handleDownload(); }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setCurrentSlide(0); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          My Weather Wrapped
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Weather Wrapped
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="h-[500px] rounded-2xl bg-muted animate-pulse flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : !wrappedData ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center">
              <CloudSun className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Make some predictions first to see your Weather Wrapped!</p>
            </div>
          ) : (
            <>
              <div
                className="relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={handleInteraction}
              >
                {/* Auto-advance bar */}
                <SlideProgressBar
                  active={!paused && currentSlide < TOTAL_SLIDES - 1}
                  onComplete={handleAutoAdvance}
                />
                {slides[currentSlide]}
              </div>

              <div className="flex items-center justify-between mt-3">
                <Button variant="ghost" size="icon" disabled={currentSlide === 0} onClick={() => { setCurrentSlide(s => s - 1); handleInteraction(); }}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex gap-1.5">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => { setCurrentSlide(i); handleInteraction(); }}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  ))}
                </div>
                <Button variant="ghost" size="icon" disabled={currentSlide === slides.length - 1} onClick={() => { setCurrentSlide(s => s + 1); handleInteraction(); }}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button onClick={handleShare} className="flex-1 gap-2" size="sm">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2" size="sm">
                  <Download className="w-4 h-4" /> Save
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
