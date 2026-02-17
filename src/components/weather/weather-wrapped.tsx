import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ChevronLeft, ChevronRight, Download, Share2, Trophy, Target, Flame, Brain, CloudSun, Zap } from "lucide-react";
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
}

function getPersonality(data: { accuracy: number; totalPredictions: number; conditionBreakdown: Record<string, number> }): { name: string; emoji: string; description: string } {
  const { accuracy, totalPredictions, conditionBreakdown } = data;
  
  // Check dominant condition
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

// Individual slide components
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
  return (
    <SlideWrapper slideRef={slideRef} gradient="from-emerald-600 via-teal-600 to-cyan-500">
      <div>
        <img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-5">
        <h3 className="text-white/70 text-sm uppercase tracking-widest">Your Numbers</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-white mb-1">
              <span className="text-sm">Total Predictions</span>
              <span className="text-2xl font-bold">{data.totalPredictions}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-white mb-1">
              <span className="text-sm">Accuracy</span>
              <span className="text-2xl font-bold">{data.accuracy}%</span>
            </div>
            <Progress value={data.accuracy} className="h-2 bg-white/20" />
          </div>
          <div>
            <div className="flex justify-between text-white mb-1">
              <span className="text-sm">Total Points</span>
              <span className="text-2xl font-bold">{data.totalPoints.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-white">
              <span className="text-sm">Longest Streak</span>
              <span className="text-2xl font-bold">{data.longestStreak} days 🔥</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-white/50 text-xs text-center">rainz.lovable.app</p>
    </SlideWrapper>
  );
}

function AccuracySlide({ data, slideRef }: { data: WrappedData; slideRef: React.Ref<HTMLDivElement> }) {
  const ringPercent = data.accuracy;
  return (
    <SlideWrapper slideRef={slideRef} gradient="from-amber-500 via-orange-500 to-red-500">
      <div>
        <img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" />
      </div>
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
        <p className="text-white/80 text-center text-sm">
          {data.correctPredictions} correct out of {data.verifiedPredictions} verified
        </p>
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
      <div>
        <img src={rainzLogo} alt="Rainz" className="h-6 brightness-0 invert" />
      </div>
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

export function WeatherWrapped() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  const { data: wrappedData, isLoading } = useQuery<WrappedData | null>({
    queryKey: ["weather-wrapped", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      if (!user) return null;

      // Fetch predictions
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("*")
        .eq("user_id", user.id)
        .order("points_earned", { ascending: false });

      if (!predictions || predictions.length === 0) return null;

      const verified = predictions.filter(p => p.is_verified);
      const correct = verified.filter(p => p.is_correct);
      const accuracy = verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : 0;

      // Location frequency
      const locationCounts: Record<string, number> = {};
      predictions.forEach(p => {
        locationCounts[p.location_name] = (locationCounts[p.location_name] || 0) + 1;
      });
      const mostPredictedLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      // Condition breakdown
      const conditionBreakdown: Record<string, number> = {};
      predictions.forEach(p => {
        conditionBreakdown[p.predicted_condition] = (conditionBreakdown[p.predicted_condition] || 0) + 1;
      });

      // Best prediction
      const best = predictions.find(p => p.points_earned && p.points_earned > 0);
      const bestPrediction = best ? {
        date: new Date(best.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        location: best.location_name,
        pointsEarned: best.points_earned || 0,
      } : null;

      // Streaks
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .maybeSingle();

      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("total_points, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      // Rank from leaderboard
      const { data: leaderboard } = await supabase.rpc("get_leaderboard");
      const userRank = leaderboard?.find((l: any) => l.display_name === profileData?.created_at)?.rank || null;
      // Alternative: find by matching points
      let rank: number | null = null;
      if (leaderboard && profileData) {
        const entry = leaderboard.findIndex((l: any) => l.total_points === profileData.total_points);
        rank = entry >= 0 ? entry + 1 : null;
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
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const slides = wrappedData ? [
    <IntroSlide key="intro" data={wrappedData} slideRef={slideRefs[0]} />,
    <StatsSlide key="stats" data={wrappedData} slideRef={slideRefs[1]} />,
    <AccuracySlide key="accuracy" data={wrappedData} slideRef={slideRefs[2]} />,
    <RankSlide key="rank" data={wrappedData} slideRef={slideRefs[3]} />,
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
    } catch {
      toast.error("Failed to save image");
    }
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
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <div className="relative">
                {slides[currentSlide]}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(s => s - 1)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="flex gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  disabled={currentSlide === slides.length - 1}
                  onClick={() => setCurrentSlide(s => s + 1)}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button onClick={handleShare} className="flex-1 gap-2" size="sm">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2" size="sm">
                  <Download className="w-4 h-4" />
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
