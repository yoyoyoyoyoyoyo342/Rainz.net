import { Suspense, lazy, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LocationSearch } from "@/components/weather/location-search";
import { SEOHead } from "@/components/seo/seo-head";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";

const PredictionDialog = lazy(() => import("@/components/weather/prediction-dialog").then(m => ({ default: m.PredictionDialog })));
const Leaderboard = lazy(() => import("@/components/weather/leaderboard").then(m => ({ default: m.Leaderboard })));
const PredictionBattles = lazy(() => import("@/components/weather/prediction-battles").then(m => ({ default: m.PredictionBattles })));

export default function PredictPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Predict</h1>
          </div>

          <LocationSearch
            onLocationSelect={(lat, lon, name) => setSelectedLocation({ lat, lon, name })}
            isImperial={isImperial}
          />

          {savedLocations.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {savedLocations.map((loc: any) => {
                const isActive = selectedLocation &&
                  Math.abs(Number(loc.latitude) - selectedLocation.lat) < 0.01 &&
                  Math.abs(Number(loc.longitude) - selectedLocation.lon) < 0.01;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation({ lat: Number(loc.latitude), lon: Number(loc.longitude), name: loc.name })}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-muted/50 text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {loc.name.split(',')[0].trim()}
                  </button>
                );
              })}
            </div>
          )}

          {selectedLocation && (
            <Suspense fallback={null}>
              <PredictionDialog
                location={selectedLocation.name}
                latitude={selectedLocation.lat}
                longitude={selectedLocation.lon}
                isImperial={isImperial}
                onPredictionMade={() => {}}
              />
            </Suspense>
          )}

          <Suspense fallback={null}>
            {selectedLocation && (
              <PredictionBattles
                location={selectedLocation.name}
                latitude={selectedLocation.lat}
                longitude={selectedLocation.lon}
              />
            )}
          </Suspense>

          <Suspense fallback={null}>
            <Leaderboard />
          </Suspense>
        </div>
      </div>
      <BottomTabBar />
    </>
  );
}
