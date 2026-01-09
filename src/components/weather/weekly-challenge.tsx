import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Trophy, Target, TrendingUp, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface WeeklyChallengeProps {
  location: string;
  latitude: number;
  longitude: number;
  onMakePrediction: () => void;
}

interface WeeklyProgress {
  daysCompleted: number;
  correctPredictions: number;
  totalPoints: number;
  currentWeekStart: string;
  predictions: Array<{
    date: string;
    isVerified: boolean;
    isCorrect: boolean | null;
    pointsEarned: number | null;
  }>;
}

export function WeeklyChallenge({
  location,
  latitude,
  longitude,
  onMakePrediction,
}: WeeklyChallengeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the start of the current week (Monday)
  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  // Get the end of the current week (Sunday)
  const getWeekEnd = () => {
    const weekStart = new Date(getWeekStart());
    weekStart.setDate(weekStart.getDate() + 6);
    return weekStart.toISOString().split("T")[0];
  };

  // Calculate days remaining in the week
  const getDaysRemaining = () => {
    const today = new Date();
    const weekEnd = new Date(getWeekEnd());
    const diff = Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff + 1);
  };

  useEffect(() => {
    const fetchWeeklyProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const weekStart = getWeekStart();
        const weekEnd = getWeekEnd();

        const { data, error } = await supabase
          .from("weather_predictions")
          .select("prediction_date, is_verified, is_correct, points_earned")
          .eq("user_id", user.id)
          .gte("prediction_date", weekStart)
          .lte("prediction_date", weekEnd)
          .order("prediction_date", { ascending: true });

        if (error) throw error;

        const predictions = data?.map((p) => ({
          date: p.prediction_date,
          isVerified: p.is_verified || false,
          isCorrect: p.is_correct,
          pointsEarned: p.points_earned,
        })) || [];

        const correctPredictions = predictions.filter((p) => p.isCorrect === true).length;
        const totalPoints = predictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);

        setProgress({
          daysCompleted: predictions.length,
          correctPredictions,
          totalPoints,
          currentWeekStart: weekStart,
          predictions,
        });
      } catch (error) {
        console.error("Error fetching weekly progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyProgress();
  }, [user]);

  const hasPredictionForToday = () => {
    if (!progress) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    return progress.predictions.some((p) => p.date === tomorrowStr);
  };

  const getStreakBonus = (daysCompleted: number) => {
    if (daysCompleted >= 7) return { bonus: 100, label: "Perfect Week!" };
    if (daysCompleted >= 5) return { bonus: 50, label: "Great Week!" };
    if (daysCompleted >= 3) return { bonus: 25, label: "Good Progress!" };
    return null;
  };

  const daysRemaining = getDaysRemaining();
  const progressPercent = progress ? (progress.daysCompleted / 7) * 100 : 0;
  const streakBonus = progress ? getStreakBonus(progress.daysCompleted) : null;

  if (loading) {
    return (
      <Card className="glass-card border border-border/20 rounded-2xl animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-primary/20 rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Weekly Forecast Challenge</CardTitle>
          </div>
          {streakBonus && (
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
              <Star className="w-3 h-3 mr-1" />
              +{streakBonus.bonus} bonus
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">This week's progress</span>
            <span className="font-medium">{progress?.daysCompleted || 0}/7 days</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{daysRemaining} days remaining</span>
            {streakBonus && <span className="text-primary">{streakBonus.label}</span>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">{progress?.daysCompleted || 0}</div>
            <div className="text-xs text-muted-foreground">Predictions</div>
          </div>
          <div className="bg-green-500/5 rounded-lg p-3 text-center">
            <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">{progress?.correctPredictions || 0}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="bg-yellow-500/5 rounded-lg p-3 text-center">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-lg font-bold">{progress?.totalPoints || 0}</div>
            <div className="text-xs text-muted-foreground">Points</div>
          </div>
        </div>

        {/* Day indicators */}
        <div className="flex justify-between gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
            const weekStart = new Date(getWeekStart());
            weekStart.setDate(weekStart.getDate() + index);
            const dateStr = weekStart.toISOString().split("T")[0];
            const prediction = progress?.predictions.find((p) => p.date === dateStr);
            const isToday = new Date().toISOString().split("T")[0] === dateStr;
            const isPast = new Date(dateStr) < new Date(new Date().toISOString().split("T")[0]);

            return (
              <div
                key={index}
                className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                  prediction?.isCorrect === true
                    ? "bg-green-500 text-white"
                    : prediction?.isCorrect === false
                    ? "bg-red-500/50 text-white"
                    : prediction
                    ? "bg-primary/50 text-white"
                    : isToday
                    ? "bg-primary/20 border-2 border-primary text-primary"
                    : isPast
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {!hasPredictionForToday() ? (
          <Button onClick={onMakePrediction} className="w-full gap-2">
            <TrendingUp className="w-4 h-4" />
            Make Today's Prediction
          </Button>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-2">
            <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
            Tomorrow's prediction submitted!
          </div>
        )}

        {/* Bonus Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>🎯 Predict 7 days = +100 bonus points</p>
          <p>⭐ Predict 5+ days = +50 bonus points</p>
        </div>
      </CardContent>
    </Card>
  );
}