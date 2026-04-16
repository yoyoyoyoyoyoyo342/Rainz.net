import { Suspense, lazy, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, LogIn, Medal, Flame, Zap, Trophy, History, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/seo-head";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context";
import { trackPredictionMade } from "@/lib/track-event";

const WeatherPredictionForm = lazy(() => import("@/components/weather/weather-prediction-form").then(m => ({ default: m.WeatherPredictionForm })));
const Leaderboard = lazy(() => import("@/components/weather/leaderboard").then(m => ({ default: m.Leaderboard })));
const PointsHistory = lazy(() => import("@/components/weather/points-history").then(m => ({ default: m.PointsHistory })));
const PointsShop = lazy(() => import("@/components/weather/points-shop").then(m => ({ default: m.PointsShop })));
const PredictionBattles = lazy(() => import("@/components/weather/prediction-battles").then(m => ({ default: m.PredictionBattles })));

export default function PredictPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("predict");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [isImperial, setIsImperial] = useState(false);

  // Load user's primary saved location
  const { data: savedLocations = [] } = useQuery({
    queryKey: ["saved-locations"],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return [];
      const { data } = await supabase
        .from("saved_locations")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("name");
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // User stats
  const { data: userStats } = useQuery({
    queryKey: ["predict-user-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("is_correct, is_verified, points_earned, user_id, prediction_date")
        .eq("user_id", user.id);

      const verified = predictions?.filter(p => p.is_verified) || [];
      const correct = verified.filter(p => p.is_correct).length;
      const accuracy = verified.length > 0 ? Math.round((correct / verified.length) * 100) : 0;

      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const { data: monthlyPredictions } = await supabase
        .from("weather_predictions")
        .select("user_id, points_earned")
        .gte("prediction_date", monthStart.split("T")[0])
        .lt("prediction_date", monthEnd.split("T")[0]);

      const userMonthlyPoints: Record<string, number> = {};
      (monthlyPredictions || []).forEach((p: any) => {
        userMonthlyPoints[p.user_id] = (userMonthlyPoints[p.user_id] || 0) + (p.points_earned || 0);
      });
      const myPoints = userMonthlyPoints[user.id] || 0;
      const rank = Object.values(userMonthlyPoints).filter(pts => pts > myPoints).length + 1;

      return { rank, streak: streakData?.current_streak || 0, totalPredictions: predictions?.length || 0, accuracy };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!selectedLocation && savedLocations.length > 0) {
      const primary = savedLocations[0];
      setSelectedLocation({ lat: Number(primary.latitude), lon: Number(primary.longitude), name: primary.name });
    }
  }, [savedLocations, selectedLocation]);

  if (!user) {
    return (
      <>
        <SEOHead title="Predict — Rainz Weather" description="Make weather predictions and compete on the leaderboard" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="glass-card max-w-sm w-full">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Predict the Weather</h2>
              <p className="text-sm text-muted-foreground text-center">
                Make daily predictions, earn points, and climb the leaderboard. Sign in to get started!
              </p>
              <Button onClick={() => navigate("/auth")} className="gap-2 w-full">
                <LogIn className="w-4 h-4" /> Sign In to Predict
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomTabBar />
      </>
    );
  }

  return (
    <>
      <SEOHead title="Predict — Rainz Weather" description="Make weather predictions and compete on the leaderboard" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Predict</h1>
          </div>

          {/* Quick Stats */}
          {userStats && (
            <div className="grid grid-cols-4 gap-2">
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

          {/* Location info */}
          {selectedLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{selectedLocation.name}</span>
            </div>
          )}

          {/* Tabs: Predict, Leaders, History, Shop */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-11">
              <TabsTrigger value="predict" className="gap-1 text-xs">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Predict</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 text-xs">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Leaders</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 text-xs">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="shop" className="gap-1 text-xs">
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Shop</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predict" className="mt-4 space-y-4">
              {/* Points Info */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    How Points Work
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-700 text-[10px]">+300</Badge>
                      <span>All 3 correct (1x)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 text-[10px]">+200</Badge>
                      <span>2 correct (1x)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 text-[10px]">+100</Badge>
                      <span>1 correct (1x)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-500/20 text-red-700 text-[10px]">-100</Badge>
                      <span>All wrong (1x)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    🔥 Use Confidence Betting to multiply your rewards (and risks)! Up to 2.5x with All-In.
                  </p>
                </CardContent>
              </Card>

              {selectedLocation && (
                <Suspense fallback={null}>
                  <WeatherPredictionForm
                    location={selectedLocation.name}
                    latitude={selectedLocation.lat}
                    longitude={selectedLocation.lon}
                    onPredictionMade={() => trackPredictionMade(selectedLocation.name)}
                    isImperial={isImperial}
                  />
                </Suspense>
              )}

              {selectedLocation && (
                <Suspense fallback={null}>
                  <PredictionBattles
                    location={selectedLocation.name}
                    latitude={selectedLocation.lat}
                    longitude={selectedLocation.lon}
                  />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-4 space-y-4">
              <Suspense fallback={null}>
                <Leaderboard />
              </Suspense>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Suspense fallback={null}>
                <PointsHistory />
              </Suspense>
            </TabsContent>

            <TabsContent value="shop" className="mt-4">
              <Suspense fallback={null}>
                <PointsShop />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <BottomTabBar />
    </>
  );
}
