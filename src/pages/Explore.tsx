import { Suspense, lazy, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Compass } from "lucide-react";
import { SEOHead } from "@/components/seo/seo-head";
import { BottomTabBar } from "@/components/weather/bottom-tab-bar";
import { LocationSearch } from "@/components/weather/location-search";

const WeatherTimeMachine = lazy(() => import("@/components/weather/weather-time-machine").then(m => ({ default: m.WeatherTimeMachine })));
const WeatherReactionsFeed = lazy(() => import("@/components/weather/weather-reactions-feed").then(m => ({ default: m.WeatherReactionsFeed })));
const WeatherTrendsCard = lazy(() => import("@/components/weather/weather-trends-card").then(m => ({ default: m.WeatherTrendsCard })));
const StreakChallenge = lazy(() => import("@/components/weather/streak-challenge").then(m => ({ default: m.StreakChallenge })));
const WeatherPersonalityQuiz = lazy(() => import("@/components/weather/weather-personality-quiz").then(m => ({ default: m.WeatherPersonalityQuiz })));
const WeatherMoodJournal = lazy(() => import("@/components/weather/weather-mood-journal").then(m => ({ default: m.WeatherMoodJournal })));
const WeatherTrivia = lazy(() => import("@/components/weather/weather-trivia").then(m => ({ default: m.WeatherTrivia })));
const WeatherCompare = lazy(() => import("@/components/weather/weather-compare").then(m => ({ default: m.WeatherCompare })));
const PhotoChallenge = lazy(() => import("@/components/weather/photo-challenge").then(m => ({ default: m.PhotoChallenge })));
const WeatherDebateArena = lazy(() => import("@/components/weather/weather-debate-arena").then(m => ({ default: m.WeatherDebateArena })));
const LiveWeatherMap = lazy(() => import("@/components/weather/live-weather-map").then(m => ({ default: m.LiveWeatherMap })));
const FeatureIdeasCard = lazy(() => import("@/components/weather/feature-ideas-card").then(m => ({ default: m.FeatureIdeasCard })));
const ReferralProgram = lazy(() => import("@/components/weather/referral-program").then(m => ({ default: m.ReferralProgram })));

export default function ExplorePage() {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [isImperial] = useState(false);

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

  const lat = selectedLocation?.lat || 59.91;
  const lon = selectedLocation?.lon || 10.75;
  const locationName = selectedLocation?.name || "Oslo";

  return (
    <>
      <SEOHead title="Explore — Rainz Weather" description="Weather tools, games, debates, and more" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Explore</h1>
          </div>

          <LocationSearch
            onLocationSelect={(lt, ln, name) => setSelectedLocation({ lat: lt, lon: ln, name })}
            isImperial={isImperial}
          />
          {/* Location info */}
          {selectedLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Compass className="w-4 h-4" />
              <span>{selectedLocation.name.split(',')[0].trim()}</span>
            </div>
          )}

          <Suspense fallback={null}>
            <div className="space-y-4">
              <LiveWeatherMap latitude={lat} longitude={lon} locationName={locationName} userId={user?.id} />
              <WeatherTimeMachine latitude={lat} longitude={lon} locationName={locationName} isImperial={isImperial} />
              <WeatherReactionsFeed latitude={lat} longitude={lon} locationName={locationName} />
              <PhotoChallenge latitude={lat} longitude={lon} locationName={locationName} />
              <WeatherDebateArena latitude={lat} longitude={lon} locationName={locationName} />
              <WeatherTrivia />
              <WeatherPersonalityQuiz />
              <WeatherMoodJournal />
              <WeatherCompare isImperial={isImperial} />
              <WeatherTrendsCard location={locationName} latitude={lat} longitude={lon} isImperial={isImperial} />
              {user && <StreakChallenge latitude={lat} longitude={lon} locationName={locationName} />}
              <ReferralProgram />
              <FeatureIdeasCard />
            </div>
          </Suspense>
        </div>
      </div>
      <BottomTabBar />
    </>
  );
}
