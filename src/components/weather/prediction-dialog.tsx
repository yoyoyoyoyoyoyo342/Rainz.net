import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Target, Trophy, Flame, Zap, Medal, ShoppingBag, Users } from "lucide-react";
import { WeatherPredictionForm } from "./weather-prediction-form";
import { Leaderboard } from "./leaderboard";
import { WeeklyChallenge } from "./weekly-challenge";
import { SeasonalTournament } from "./seasonal-tournament";
import { PointsShop } from "./points-shop";
import { BattleLeagues } from "./battle-leagues";
import { useLanguage } from "@/contexts/language-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { trackPredictionMade } from "@/lib/track-event";

interface PredictionDialogProps {
  location: string;
  latitude: number;
  longitude: number;
  isImperial: boolean;
  onPredictionMade: () => void;
}

export const PredictionDialog = ({
  location,
  latitude,
  longitude,
  isImperial,
  onPredictionMade
}: PredictionDialogProps): React.JSX.Element => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("predict");
  const [leaderboardType, setLeaderboardType] = useState("all-time");
  const [userStats, setUserStats] = useState<{
    rank: number;
    streak: number;
    totalPredictions: number;
    accuracy: number;
  } | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (user && open) {
      fetchUserStats();
    }
  }, [user, open]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get user's predictions stats
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("is_correct, is_verified")
        .eq("user_id", user.id);

      const verified = predictions?.filter(p => p.is_verified) || [];
      const correct = verified.filter(p => p.is_correct).length;
      const accuracy = verified.length > 0 ? Math.round((correct / verified.length) * 100) : 0;

      // Get streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get rank from leaderboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("user_id", user.id)
        .single();

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("total_points", profile?.total_points || 0);

      setUserStats({
        rank: (count || 0) + 1,
        streak: streakData?.current_streak || 0,
        totalPredictions: predictions?.length || 0,
        accuracy
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handlePredictionMade = async () => {
    trackPredictionMade(location);
    onPredictionMade();
    setOpen(false);
    fetchUserStats();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 px-4 text-sm sm:h-8 sm:px-3 sm:text-xs flex-1 sm:flex-initial relative">
          <Target className="w-4 h-4 sm:w-3 sm:h-3 mr-2 sm:mr-1" />
          Make Prediction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Weather Predictions
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Test your forecasting skills and climb the leaderboard
          </DialogDescription>
        </DialogHeader>

        {/* Quick Stats Bar */}
        {user && userStats && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-600">
                  <Medal className="w-3 h-3" />
                  <span className="text-xs">Rank</span>
                </div>
                <p className="text-lg font-bold">#{userStats.rank}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-600">
                  <Flame className="w-3 h-3" />
                  <span className="text-xs">Streak</span>
                </div>
                <p className="text-lg font-bold">{userStats.streak}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <Target className="w-3 h-3" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-lg font-bold">{userStats.totalPredictions}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs">Accuracy</span>
                </div>
                <p className="text-lg font-bold">{userStats.accuracy}%</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="predict" className="gap-1 text-xs sm:text-sm">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Predict</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1 text-xs sm:text-sm">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaders</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="gap-1 text-xs sm:text-sm">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Shop</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="predict" className="mt-4">
            {/* Points Info */}
            <Card className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-3">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  How Points Work
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-700 text-[10px]">+300</Badge>
                    <span>All 3 correct + Free Freeze!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 text-[10px]">+200</Badge>
                    <span>2 correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 text-[10px]">+100</Badge>
                    <span>1 correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-500/20 text-red-700 text-[10px]">-100</Badge>
                    <span>All wrong</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <WeatherPredictionForm
              location={location}
              latitude={latitude}
              longitude={longitude}
              onPredictionMade={handlePredictionMade}
              isImperial={isImperial}
            />
          </TabsContent>
          
          <TabsContent value="leaderboard" className="mt-4 space-y-4">
            {/* Leaderboard Type Selector */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Leaderboard
              </h3>
              <Select value={leaderboardType} onValueChange={setLeaderboardType}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="seasonal">This Season</SelectItem>
                  <SelectItem value="leagues">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      My Leagues
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {leaderboardType === "all-time" && <Leaderboard />}
            {leaderboardType === "weekly" && (
              <WeeklyChallenge
                location={location}
                latitude={latitude}
                longitude={longitude}
                onMakePrediction={() => setActiveTab("predict")}
              />
            )}
            {(leaderboardType === "monthly" || leaderboardType === "seasonal") && (
              <SeasonalTournament />
            )}
            {leaderboardType === "leagues" && (
              <BattleLeagues />
            )}
          </TabsContent>
          
          <TabsContent value="shop" className="mt-4">
            <PointsShop />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
