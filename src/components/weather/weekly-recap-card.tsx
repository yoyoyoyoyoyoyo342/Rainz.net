import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Share2, Download, Flame, Target, Trophy, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import rainzLogo from "@/assets/rainz-logo-new.png";

interface RecapData {
  id: string;
  week_start: string;
  total_predictions: number;
  accuracy: number;
  points_earned: number;
  streak: number;
  highlights: Record<string, any>;
  is_read: boolean;
}

const SLIDES = [
  { key: "overview", gradient: "from-primary to-blue-600" },
  { key: "accuracy", gradient: "from-emerald-500 to-teal-600" },
  { key: "streak", gradient: "from-orange-500 to-red-500" },
  { key: "points", gradient: "from-violet-500 to-purple-600" },
  { key: "summary", gradient: "from-primary to-indigo-600" },
];

export function WeeklyRecapCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: recap, isLoading } = useQuery({
    queryKey: ["weekly-recap", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("weekly_recaps")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as RecapData | null;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async () => {
      if (!recap) return;
      await supabase
        .from("weekly_recaps")
        .update({ is_read: true })
        .eq("id", recap.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-recap"] }),
  });

  if (!user || isLoading || !recap || recap.is_read || dismissed || recap.total_predictions === 0) {
    return null;
  }

  const weekDate = new Date(recap.week_start);
  const weekLabel = weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const handleDismiss = () => {
    markRead.mutate();
    setDismissed(true);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const png = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `rainz-recap-${recap.week_start}.png`;
      link.href = png;
      link.click();
      toast.success("Recap image downloaded!");
    } catch {
      toast.error("Failed to generate image");
    }
  };

  const nextSlide = () => setCurrentSlide((s) => Math.min(s + 1, SLIDES.length - 1));
  const prevSlide = () => setCurrentSlide((s) => Math.max(s - 1, 0));

  const slide = SLIDES[currentSlide];

  return (
    <div className="mb-4">
      <div ref={cardRef}>
        <Card className={`relative overflow-hidden bg-gradient-to-br ${slide.gradient} text-white border-0 rounded-2xl`}>
          <CardContent className="p-5 min-h-[200px] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src={rainzLogo} alt="Rainz" className="h-5 w-5 rounded" />
                <span className="text-xs font-medium opacity-80">Weekly Recap · {weekLabel}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Slide content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              {currentSlide === 0 && (
                <>
                  <Sparkles className="h-10 w-10 mb-3 opacity-90" />
                  <h3 className="text-xl font-bold mb-1">Your Week in Weather</h3>
                  <p className="text-sm opacity-80">
                    You made <span className="font-bold text-lg">{recap.total_predictions}</span> predictions this week
                  </p>
                </>
              )}
              {currentSlide === 1 && (
                <>
                  <Target className="h-10 w-10 mb-3 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Accuracy</h3>
                  <div className="text-5xl font-black mb-2">{Math.round(Number(recap.accuracy))}%</div>
                  <div className="w-48 mx-auto">
                    <Progress value={Number(recap.accuracy)} className="h-2 bg-white/20 [&>div]:bg-white" />
                  </div>
                  <p className="text-xs opacity-70 mt-2">
                    {Number(recap.accuracy) >= 70 ? "🔥 Incredible week!" : Number(recap.accuracy) >= 50 ? "👍 Solid predictions!" : "📈 Room to grow!"}
                  </p>
                </>
              )}
              {currentSlide === 2 && (
                <>
                  <Flame className="h-10 w-10 mb-3 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Streak</h3>
                  <div className="text-5xl font-black mb-1">{recap.streak}</div>
                  <p className="text-sm opacity-80">day streak {recap.streak >= 7 ? "🔥" : "💪"}</p>
                </>
              )}
              {currentSlide === 3 && (
                <>
                  <Trophy className="h-10 w-10 mb-3 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Points Earned</h3>
                  <div className="text-5xl font-black mb-1">+{recap.points_earned}</div>
                  <p className="text-sm opacity-80">Keep predicting to climb the leaderboard!</p>
                </>
              )}
              {currentSlide === 4 && (
                <>
                  <TrendingUp className="h-10 w-10 mb-3 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Week Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{recap.total_predictions}</div>
                      <div className="text-xs opacity-70">Predictions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{Math.round(Number(recap.accuracy))}%</div>
                      <div className="text-xs opacity-70">Accuracy</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">+{recap.points_earned}</div>
                      <div className="text-xs opacity-70">Points</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 h-8"
                onClick={prevSlide}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-1.5">
                {SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide ? "w-4 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>

              {currentSlide < SLIDES.length - 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8"
                  onClick={nextSlide}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8"
                  onClick={handleShare}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
