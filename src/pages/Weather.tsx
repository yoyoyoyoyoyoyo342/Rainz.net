import React, { useState, useEffect, useMemo, useRef, Suspense, lazy, useTransition } from "react";
import { queryClient } from "@/lib/queryClient";
import { CloudSun, WifiOff, MapPin, Flame } from "lucide-react";
import { brandName } from "@/lib/birthday-mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { weatherApi } from "@/lib/weather-api";
import { WeatherResponse } from "@/types/weather";
import { checkWeatherAlerts } from "@/lib/weather-alerts";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useLanguage } from "@/contexts/language-context";
import { useTimeOfDay } from "@/hooks/use-time-of-day";
import { useTimeOfDayContext } from "@/contexts/time-of-day-context";
import { useHyperlocalWeather } from "@/hooks/use-hyperlocal-weather";
import { usePremiumSettings } from "@/hooks/use-premium-settings";
import { trackWeatherView } from "@/lib/track-event";
import { useAccountStorage } from "@/hooks/use-account-storage";
import { useOfflineCache } from "@/hooks/use-offline-cache";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAmplitudeGuidedHelp } from "@/hooks/use-amplitude-guided-help";
import { useUserStreaks } from "@/hooks/use-user-streaks";

import { ProductHuntLaunchBanner } from "@/components/weather/producthunt-launch-banner";


// Critical above-the-fold components — loaded eagerly
import { LocationSearch } from "@/components/weather/location-search";
import { CurrentWeather } from "@/components/weather/current-weather";
import { SkyCamStationViewer } from "@/components/weather/skycam-station-viewer";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";
import { AnimatedCard } from "@/components/ui/animated-card";
import { SEOHead } from "@/components/seo/seo-head";
import { SkyRenderer } from "@/components/rainz/sky-renderer";
import { AIBriefingHero } from "@/components/rainz/ai-briefing-hero";
import { WhatsNewDialog } from "@/components/rejn/whats-new-dialog";
import { PredictiveTimeline } from "@/components/rejn/predictive-timeline";
import { RouteSenseBanner } from "@/components/rejn/route-sense-banner";
import { CalendarExportButton } from "@/components/rejn/calendar-export-button";
import { HolidayBackground, getCurrentHoliday } from "@/components/weather/holiday-backgrounds";
import { HeaderInfoBar } from "@/components/weather/header-info-bar";
import { SettingsDialog } from "@/components/weather/settings-dialog";
import { WeatherStationInfo } from "@/components/weather/weather-station-info";
import { WinterAlerts } from "@/components/weather/winter-alerts";

const GuidedHelpBanner = lazy(() => import("@/components/weather/guided-help-banner").then(m => ({ default: m.GuidedHelpBanner })));

// Below-the-fold components — lazy loaded for faster initial render
const TenDayForecast = lazy(() => import("@/components/weather/ten-day-forecast").then(m => ({ default: m.TenDayForecast })));
const DetailedMetrics = lazy(() => import("@/components/weather/detailed-metrics").then(m => ({ default: m.DetailedMetrics })));
const PollenCard = lazy(() => import("@/components/weather/pollen-card").then(m => ({ default: m.PollenCard })));

const SkyCamSubmissionDialog = lazy(() => import("@/components/weather/skycam-submission-dialog").then(m => ({ default: m.SkyCamSubmissionDialog })));
const AIChatButton = lazy(() => import("@/components/weather/ai-chat-button").then(m => ({ default: m.AIChatButton })));
const MorningWeatherReview = lazy(() => import("@/components/weather/morning-weather-review").then(m => ({ default: m.MorningWeatherReview })));
const SocialWeatherCard = lazy(() => import("@/components/weather/social-weather-card").then(m => ({ default: m.SocialWeatherCard })));
const ARWeatherOverlay = lazy(() => import("@/components/weather/ar-weather-overlay").then(m => ({ default: m.ARWeatherOverlay })));
const AQICard = lazy(() => import("@/components/weather/aqi-card").then(m => ({ default: m.AQICard })));
const BarometerCard = lazy(() => import("@/components/weather/barometer-card").then(m => ({ default: m.BarometerCard })));
const RainMapCard = lazy(() => import("@/components/weather/rain-map-card"));
const DryRoute = lazy(() => import("@/components/weather/dry-route").then(m => ({ default: m.DryRoute })));
const AffiliateCard = lazy(() => import("@/components/weather/affiliate-card").then(m => ({ default: m.AffiliateCard })));
const ChristmasCalendar = lazy(() => import("@/components/weather/christmas-calendar").then(m => ({ default: m.ChristmasCalendar })));
const RamadanCalendar = lazy(() => import("@/components/weather/ramadan-calendar").then(m => ({ default: m.RamadanCalendar })));


import { BottomTabBar } from "@/components/weather/bottom-tab-bar";

export default function WeatherPage() {
  // Legacy redirect: old battle share links pointed to "/?accept_battle=..." — forward to /predict
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const battleId = params.get("accept_battle");
    if (battleId) {
      window.location.replace(`/predict?accept_battle=${battleId}`);
    }
  }, []);


  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [isImperial, setIsImperial] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { streakData } = useUserStreaks();

  const { visibleCards, cardOrder, is24Hour, isHighContrast } = useUserPreferences();
  const { t } = useLanguage();
  const { setTimeOfDay } = useTimeOfDayContext();
  const { settings: premiumSettings } = usePremiumSettings();
  const { data: hyperlocalData } = useHyperlocalWeather(selectedLocation?.lat, selectedLocation?.lon);
  const { data: accountData, loading: accountLoading, setUserLocation: saveLocationToAccount, setLocationPermission } = useAccountStorage();
  const { saveToCache, getFromCache, isEnabled: offlineCacheEnabled } = useOfflineCache();
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const mountTimeRef = useRef(performance.now());
  const hasLoggedTimingRef = useRef(false);
  const currentHoliday = getCurrentHoliday();
  
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  const pageLoadedAtRef = useRef(Date.now());

  const { data: savedLocations = [] } = useQuery({
    queryKey: ["saved-locations"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return [];
      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { activeTip, dismiss: dismissTip } = useAmplitudeGuidedHelp({
    hasLocation: !!selectedLocation,
    hasSavedLocations: savedLocations.length > 0,
    isNewUser: !user,
    pageLoadedAt: pageLoadedAtRef.current,
  });

  const customDisplayName = useMemo(() => {
    if (!selectedLocation || savedLocations.length === 0) return null;
    const savedLoc = savedLocations.find(
      (loc: any) =>
        Math.abs(loc.latitude - selectedLocation.lat) < 0.01 && Math.abs(loc.longitude - selectedLocation.lon) < 0.01,
    );
    return savedLoc?.name || null;
  }, [selectedLocation, savedLocations]);

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [isHighContrast]);

  usePushNotifications();

  // ── Phase 1: instant raw weather (Open-Meteo only, no AI/aggregate) ──
  const {
    data: baseWeather,
    isLoading: isBaseLoading,
    isFetching: isBaseFetching,
    error,
  } = useQuery<WeatherResponse, Error>({
    queryKey: ["/api/weather/base", selectedLocation?.lat, selectedLocation?.lon, selectedLocation?.name],
    enabled: !!selectedLocation,
    queryFn: async () => {
      // Special handling for World Average
      if (selectedLocation?.name === "World Average") {
        const { data, error } = await supabase.functions.invoke("world-weather-average", {
          body: { isImperial },
        });
        if (error) throw error;
        const worldData = data;
        const baseCurrentWeather = {
          temperature: Math.round(worldData.temperature),
          humidity: worldData.humidity,
          windSpeed: worldData.windSpeed,
          windDirection: worldData.windDirection || 0,
          condition: worldData.condition,
          uvIndex: worldData.uvIndex,
          feelsLike: Math.round(worldData.feelsLike || worldData.temperature),
          visibility: worldData.visibility || 10,
          pressure: worldData.pressure || 1013,
          precipitation: 0,
          precipitationProbability: 0,
          cloudCover: worldData.cloudCover || 0,
          description: `Global average from ${worldData.citiesPolled} major cities. Hottest: ${worldData.extremes.hottest.city} (${worldData.extremes.hottest.temperature}°), Coldest: ${worldData.extremes.coldest.city} (${worldData.extremes.coldest.temperature}°)`,
        };
        const hourlyForecast = (worldData.hourlyForecast || []).map((h: any) => ({
          time: h.time, temperature: h.temperature, condition: h.condition, precipitation: h.precipitation, icon: "",
        }));
        const dailyForecast = (worldData.dailyForecast || []).map((d: any) => ({
          day: d.day, condition: d.condition, description: d.condition, highTemp: d.highTemp, lowTemp: d.lowTemp, precipitation: d.precipitation, icon: "",
        }));
        const transformedData: WeatherResponse = {
          mostAccurate: { currentWeather: baseCurrentWeather, source: "World Average", location: "World", latitude: 0, longitude: 0, accuracy: 100, hourlyForecast, dailyForecast },
          sources: [],
          aggregated: { currentWeather: baseCurrentWeather, source: "World Average", location: "World", latitude: 0, longitude: 0, accuracy: 100, hourlyForecast, dailyForecast },
        };
        setIsUsingCachedData(false);
        return transformedData;
      }

      try {
        // enhance=false → returns immediately after Open-Meteo, no AI wait
        const data = await weatherApi.getWeatherData(
          selectedLocation!.lat,
          selectedLocation!.lon,
          selectedLocation!.name,
          false,
        );
        setIsUsingCachedData(false);
        return data;
      } catch (fetchError) {
        if (offlineCacheEnabled) {
          const cached = await getFromCache(selectedLocation!.lat, selectedLocation!.lon);
          if (cached) {
            setIsUsingCachedData(true);
            toast({ title: "Using cached data", description: `Showing weather from ${new Date(cached.timestamp).toLocaleTimeString()}` });
            return cached.data as WeatherResponse;
          }
        }
        throw fetchError;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  // ── Phase 2: background AI/aggregate enhancement, silently falls back to base ──
  const { data: enhancedWeather, isFetching: isEnhancing } = useQuery<WeatherResponse, Error>({
    queryKey: ["/api/weather/enhanced", selectedLocation?.lat, selectedLocation?.lon, selectedLocation?.name],
    enabled: !!baseWeather && !!selectedLocation && selectedLocation.name !== "World Average",
    queryFn: async () => {
      try {
        const enhanced = await weatherApi.enhanceWeatherData(
          baseWeather!,
          selectedLocation!.lat,
          selectedLocation!.lon,
          selectedLocation!.name,
          5000, // 5s timeout — silent fallback
        );
        if (offlineCacheEnabled && enhanced) {
          saveToCache(selectedLocation!.lat, selectedLocation!.lon, selectedLocation!.name, enhanced);
        }
        return enhanced;
      } catch {
        return baseWeather!; // silent fallback — no error shown
      }
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  // Consumers continue to read `weatherData`; prefer enhanced once it lands.
  const weatherData = enhancedWeather ?? baseWeather;
  const isLoading = isBaseLoading;
  const isFetching = isBaseFetching || isEnhancing;



  const sunrise = weatherData?.mostAccurate?.currentWeather?.sunrise;
  const sunset = weatherData?.mostAccurate?.currentWeather?.sunset;
  const timeOfDay = useTimeOfDay(sunrise, sunset);

  useEffect(() => {
    setTimeOfDay(timeOfDay);
  }, [timeOfDay, setTimeOfDay]);

  // Performance: log time-to-data
  useEffect(() => {
    if (weatherData && !hasLoggedTimingRef.current) {
      const elapsed = Math.round(performance.now() - mountTimeRef.current);
      const fromCache = elapsed < 200;
      console.log(
        `⚡ [Rainz Perf] Weather data ready in ${elapsed}ms — ${fromCache ? '📦 from cache' : '🌐 from network'}`
      );
      hasLoggedTimingRef.current = true;
    }
  }, [weatherData]);

  // Smart prefetching: prefetch weather for top 3 saved locations after primary data loads
  const hasPrefetchedRef = useRef(false);
  useEffect(() => {
    if (!weatherData || savedLocations.length === 0 || hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;

    const locationsToPreload = savedLocations
      .filter((loc: any) =>
        !selectedLocation ||
        Math.abs(loc.latitude - selectedLocation.lat) > 0.01 ||
        Math.abs(loc.longitude - selectedLocation.lon) > 0.01
      )
      .slice(0, 3);

    locationsToPreload.forEach((loc: any) => {
      queryClient.prefetchQuery({
        queryKey: ["/api/weather", loc.latitude, loc.longitude, loc.name],
        queryFn: () => weatherApi.getWeatherData(loc.latitude, loc.longitude, loc.name),
        staleTime: 1000 * 60 * 5,
      });
    });

    if (locationsToPreload.length > 0) {
      console.log(`⚡ [Rainz Perf] Prefetching weather for ${locationsToPreload.length} saved locations`);
    }
  }, [weatherData, savedLocations, selectedLocation]);

  const actualStationName = useMemo(() => {
    const stationInfo = weatherData?.aggregated?.stationInfo || weatherData?.sources?.[0]?.stationInfo;
    return stationInfo?.name || selectedLocation?.name || "Unknown";
  }, [weatherData, selectedLocation]);

  // Helper to convert weather data to the correct units for alerts
  // Weather data from Open-Meteo is ALWAYS in Fahrenheit, but we need to convert
  // to match the user's preference before passing to checkWeatherAlerts
  const getConvertedWeatherForAlerts = useMemo(() => {
    if (!weatherData?.mostAccurate?.currentWeather) return null;
    const raw = weatherData.mostAccurate.currentWeather;

    // Data is already in Fahrenheit (from Open-Meteo)
    // If user wants Imperial (Fahrenheit), pass isImperial=true and use raw values
    // If user wants Metric (Celsius), we need to convert values AND pass isImperial=false
    if (isImperial) {
      return { weather: raw, isImperial: true };
    } else {
      // Convert Fahrenheit to Celsius for proper threshold comparison
      return {
        weather: {
          ...raw,
          temperature: Math.round(((raw.temperature - 32) * 5) / 9),
          feelsLike: Math.round(((raw.feelsLike - 32) * 5) / 9),
        },
        isImperial: false,
      };
    }
  }, [weatherData?.mostAccurate?.currentWeather, isImperial]);

  useEffect(() => {
    if (weatherData && selectedLocation) {
      setLastUpdated(new Date());

      // Track weather view
      trackWeatherView(selectedLocation.name, selectedLocation.lat, selectedLocation.lon);

      if (profile?.notification_enabled && getConvertedWeatherForAlerts) {
        const { weather, isImperial: alertIsImperial } = getConvertedWeatherForAlerts;
        const alerts = checkWeatherAlerts(weather, alertIsImperial);
        alerts.forEach((alert) => {
          toast({
            title: `${alert.icon} ${alert.title}`,
            description: alert.description,
            variant: alert.severity === "extreme" || alert.severity === "high" ? "destructive" : "default",
          });
        });
      }
    }
  }, [weatherData, profile, toast, selectedLocation]);

  useEffect(() => {
    if (!weatherData?.mostAccurate?.currentWeather) return;
    const { sunrise, sunset } = weatherData.mostAccurate.currentWeather;
    if (!sunrise || !sunset) return;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const parseSunTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const sunriseTime = parseSunTime(sunrise);
    const sunsetTime = parseSunTime(sunset);
    const isNightTime = currentTime < sunriseTime || currentTime > sunsetTime;
    if (isNightTime) {
      document.documentElement.classList.add("night-mode");
    } else {
      document.documentElement.classList.remove("night-mode");
    }
  }, [weatherData]);

  const lastErrorToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && !weatherData) {
      const msg = (error as Error).message || "Unknown error";
      if (lastErrorToastRef.current === msg) return;
      lastErrorToastRef.current = msg;
      toast({
        title: "Failed to fetch weather data",
        description: msg || "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [error, toast, weatherData]);

  // Track if we've already detected location this session
  const locationDetectedRef = useRef(false);

  useEffect(() => {
    // Wait for account data to load before detecting location
    if (accountLoading) return;
    
    // Only detect location once per session
    if (locationDetectedRef.current) return;

    const detectLocation = async () => {
      // First, check if we have a saved location from account storage
      if (accountData.userLocation) {
        locationDetectedRef.current = true;
        setSelectedLocation(accountData.userLocation);
        setIsAutoDetected(false);
        return;
      }
      
      // Check if we're offline and have cached data (premium feature)
      if (!navigator.onLine && offlineCacheEnabled) {
        try {
          const cachedLocation = await getFromCache(0, 0); // This won't work, need different approach
          const { getMostRecentCachedLocation } = await import("@/lib/offline-cache");
          const cached = await getMostRecentCachedLocation();

          if (cached) {
            locationDetectedRef.current = true;
            setSelectedLocation({
              lat: cached.latitude,
              lon: cached.longitude,
              name: cached.locationName,
            });
            setIsAutoDetected(false);
            setIsUsingCachedData(true);
            toast({
              title: "Offline Mode",
              description: `Showing cached weather for ${cached.locationName}`,
            });
            return;
          }
        } catch (error) {
          console.error("Error loading cached location:", error);
        }
      }

      // Check if location permission was previously denied - don't auto-request again
      if (accountData.locationPermissionGranted === false) {
        // User previously denied, don't auto-request - they can manually click the location button
        return;
      }

      try {
        const position = await weatherApi.getCurrentLocation();
        const { latitude, longitude } = position.coords;
        
        // Save that permission was granted
        setLocationPermission(true);

        const pickLocationNameFromGeocode = (data: any): string => {
          // Prefer human-friendly locality/city; never return just the country (e.g. "Denmark")
          return (
            data?.locality ||
            data?.city ||
            data?.principalSubdivision ||
            data?.principalSubdivisionCode ||
            data?.countryName ||
            "Current Location"
          );
        };

        // 1) Prefer the nearest *station* for detected locations
        try {
          const { data, error } = await supabase.functions.invoke("find-nearby-stations", {
            body: { latitude, longitude },
          });

          if (!error) {
            const stations = (data?.stations || []) as Array<{ latitude: number; longitude: number; name: string }>;
            if (stations.length > 0) {
              const nearest = stations[0];
              const newLocation = { lat: nearest.latitude, lon: nearest.longitude, name: nearest.name };
              locationDetectedRef.current = true;
              setSelectedLocation(newLocation);
              setIsAutoDetected(true);
              saveLocationToAccount(newLocation);
              return;
            }
          }
        } catch (e) {
          // fall through to city name
          console.warn("find-nearby-stations failed:", e);
        }

        // 2) Fallback: reverse geocode a friendly city/locality label
        try {
          const geocodeResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const geocodeData = await geocodeResponse.json();

          const cityName = pickLocationNameFromGeocode(geocodeData);
          const newLocation = { lat: latitude, lon: longitude, name: cityName };
          locationDetectedRef.current = true;
          setSelectedLocation(newLocation);
          setIsAutoDetected(true);
          saveLocationToAccount(newLocation);
        } catch {
          const newLocation = { lat: latitude, lon: longitude, name: "Current Location" };
          locationDetectedRef.current = true;
          setSelectedLocation(newLocation);
          setIsAutoDetected(true);
          saveLocationToAccount(newLocation);
        }
      } catch (err: any) {
        // Save that permission was denied
        const code = typeof err?.code === "number" ? err.code : undefined;
        const isDenied = code === 1; // GeolocationPositionError.PERMISSION_DENIED
        if (isDenied) {
          setLocationPermission(false);
        }
      }
    };

    detectLocation();
  }, [offlineCacheEnabled, accountLoading, accountData.userLocation, accountData.locationPermissionGranted]); // Add dependencies

  const handleLocationSelect = (lat: number, lon: number, locationName: string) => {
    const newLocation = { lat, lon, name: locationName };
    setSelectedLocation(newLocation);
    setIsAutoDetected(false);
    // Save to account for logged-in users, localStorage for guests
    saveLocationToAccount(newLocation);
    // Amplitude: explicit domain event for location selection
    import("@amplitude/unified")
      .then((amp) => amp.track("location_selected", { lat, lon, name: locationName }))
      .catch(() => {});
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <WhatsNewDialog />
      <SEOHead
        title={
          selectedLocation
            ? `${selectedLocation.name} Weather - Rejn`
            : `${brandName()} - AI-Powered Hyper-Local Weather Forecasts`
        }
        description={
          selectedLocation
            ? `Get accurate AI-enhanced weather forecast for ${selectedLocation.name}. Current conditions, hourly forecast, 10-day outlook, pollen levels, and severe weather alerts.`
            : `Get accurate AI-powered weather forecasts with ${brandName()}. Hyper-local predictions, pollen tracking, weather alerts, AI certainty, and a 15-day forecast. Free weather app.`
        }
        keywords={`Rejn, ${selectedLocation?.name || "local"} weather, weather forecast, AI weather, pollen tracker, weather alerts, accurate weather`}
      />
      <div className="min-h-screen overflow-x-hidden relative">
        {/* Animated backgrounds - always render both to avoid hook count issues */}
        {premiumSettings.animatedBackgrounds && (
          <>
            {currentHoliday ? (
              <HolidayBackground
                holiday={currentHoliday}
                showWeatherOverlay={true}
                weatherCondition={weatherData?.mostAccurate?.currentWeather?.condition}
                sunrise={weatherData?.mostAccurate?.currentWeather?.sunrise}
                sunset={weatherData?.mostAccurate?.currentWeather?.sunset}
              />
            ) : (
              <SkyRenderer
                condition={weatherData?.mostAccurate?.currentWeather?.condition}
                sunrise={weatherData?.mostAccurate?.currentWeather?.sunrise}
                sunset={weatherData?.mostAccurate?.currentWeather?.sunset}
                windSpeedMps={weatherData?.mostAccurate?.currentWeather?.windSpeed}
                windDirectionDeg={(weatherData?.mostAccurate?.currentWeather as any)?.windDirection}
              />
            )}
          </>
        )}

        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl relative z-10">

          {/* Product Hunt Launch Banner */}
          <ProductHuntLaunchBanner />

          {/* Maintenance Mode Banner */}
          {isFeatureEnabled('maintenance_mode', false) && (
            <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
              <span className="text-2xl">🔧</span>
              <div>
                <h3 className="font-semibold text-destructive">Maintenance Mode</h3>
                <p className="text-sm text-destructive/80">We're currently performing maintenance. Some features may be temporarily unavailable.</p>
              </div>
            </div>
          )}

          {/* Minimalist hero — wordmark, search, controls all in one airy block */}
          <section className="mb-6 relative z-[1000] space-y-4">
            {/* Top row: wordmark + controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  {brandName()}
                </h1>
                <span className="text-xs text-muted-foreground/70 hidden sm:inline">Be prepared.</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <HeaderInfoBar user={user} showInbox={true} />
                <Suspense fallback={null}>
                  <SkyCamSubmissionDialog
                    location={actualStationName}
                    locationData={{
                      latitude: selectedLocation?.lat || 0,
                      longitude: selectedLocation?.lon || 0,
                      city: selectedLocation?.name,
                    }}
                  />
                </Suspense>
                <SettingsDialog
                  isImperial={isImperial}
                  onUnitsChange={setIsImperial}
                  mostAccurate={weatherData?.mostAccurate}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = !isImperial;
                    setIsImperial(next);
                    import("@amplitude/unified")
                      .then((amp) => amp.track("unit_toggled", { unit: next ? "fahrenheit" : "celsius" }))
                      .catch(() => {});
                  }}
                  aria-label="Toggle units"
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full hover:bg-muted/40"
                >
                  {isImperial ? "°F" : "°C"}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <LocationSearch onLocationSelect={handleLocationSelect} isImperial={isImperial} />
            </div>

            {/* Saved locations + streak — minimal inline switcher */}
            {(savedLocations.length > 0 || (user && streakData)) && (
              <div className="flex items-center gap-2 px-1 text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                  {savedLocations.length > 0 && (
                    <>
                      <span className="shrink-0 uppercase tracking-[0.18em] text-[10px] font-semibold text-muted-foreground/70">
                        Saved
                      </span>
                      <div className="flex items-center gap-3 min-w-0">
                        {savedLocations.slice(0, 5).map((loc: any, idx: number) => {
                          const isActive = selectedLocation &&
                            Math.abs(loc.latitude - selectedLocation.lat) < 0.01 &&
                            Math.abs(loc.longitude - selectedLocation.lon) < 0.01;
                          const cityName = loc.name.split(',')[0].trim();
                          return (
                            <div key={loc.id} className="flex items-center gap-3 shrink-0">
                              {idx > 0 && <span className="text-muted-foreground/30">·</span>}
                              <button
                                onClick={() => handleLocationSelect(loc.latitude, loc.longitude, loc.name)}
                                className={`group relative inline-flex items-center gap-1 font-medium transition-colors active:scale-95 ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {loc.is_primary && <MapPin className="w-3 h-3 opacity-60" />}
                                <span>{cityName}</span>
                                <span
                                  className={`absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-primary transition-all ${
                                    isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {user && streakData && (
                  <div
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-400/15 border border-orange-400/40 text-orange-700 dark:text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                    title={`${streakData.currentStreak}-day streak · best ${streakData.longestStreak}`}
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-300 drop-shadow-[0_0_4px_rgba(251,146,60,0.7)]" />
                    <span className="text-xs font-bold tabular-nums leading-none">
                      {streakData.currentStreak}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 leading-none">
                      {streakData.currentStreak === 1 ? "day" : "days"}
                    </span>
                  </div>
                )}
              </div>
            )}


            {/* Station info, guided help, status indicators */}
            <Suspense fallback={null}>
              <GuidedHelpBanner tip={activeTip} onDismiss={dismissTip} />
            </Suspense>
            {weatherData?.aggregated?.stationInfo && (
              <WeatherStationInfo stationInfo={weatherData.aggregated.stationInfo} />
            )}
            {isUsingCachedData && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs w-fit">
                <WifiOff className="w-3.5 h-3.5" />
                Cached • {lastUpdated?.toLocaleTimeString()}
              </div>
            )}
            {!isLoading && weatherData && isFetching && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/5 text-muted-foreground text-xs w-fit animate-pulse">
                <CloudSun className="w-3.5 h-3.5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                Refreshing…
              </div>
            )}
          </section>
          {selectedLocation && isLoading && !weatherData ? (
            <div className="transition-opacity duration-300 ease-out">
              <WeatherPageSkeleton />
            </div>
          ) : !selectedLocation ? (
            <Card className="glass-card border border-border/20 text-center py-12 rounded-2xl">
              <CardContent className="space-y-4">
                <CloudSun className="w-16 h-16 text-primary mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">{t("weather.welcome")}</h2>
                  <p className="text-muted-foreground">{t("weather.searchLocation")}</p>
                </div>
              </CardContent>
            </Card>
          ) : error && !weatherData ? (
            <Card className="glass-card border-destructive/30 text-center py-12 rounded-2xl">
              <CardContent className="space-y-4">
                <div className="text-4xl">⚠️</div>
                <div>
                  <h2 className="text-xl font-semibold text-destructive mb-2">{t("weather.failed")}</h2>
                  <p className="text-destructive/80 mb-4">{t("weather.checkConnection")}</p>
                  <Button onClick={handleRefresh} variant="outline" size="default">
                    {t("weather.tryAgain")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : weatherData ? (
            <Suspense
              fallback={
                <div className="transition-opacity duration-200 ease-out">
                  <WeatherPageSkeleton />
                </div>
              }
            >
              <div>
              {weatherData.demo && (
                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">⚠️</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{t("weather.demoData")}</h3>
                      <p className="text-primary/80 text-sm">{weatherData.message || t("weather.demoMessage")}</p>
                    </div>
                  </div>
                </div>
              )}

              {getConvertedWeatherForAlerts && (
                <div className="mb-4">
                  <WinterAlerts
                    alerts={checkWeatherAlerts(
                      getConvertedWeatherForAlerts.weather,
                      getConvertedWeatherForAlerts.isImperial,
                    )}
                  />
                </div>
              )}





              {/* Rejn 2.0 — AI Briefing Hero (temps normalized to user's unit; raw API is always °F) */}
              <AnimatedCard index={0}>
                {(() => {
                  const raw = weatherData.mostAccurate.currentWeather;
                  const toUserUnit = (f?: number) =>
                    f === undefined || f === null
                      ? undefined
                      : isImperial
                        ? Math.round(f)
                        : Math.round(((f - 32) * 5) / 9);
                  const normalizedHourly = (weatherData.mostAccurate.hourlyForecast || []).map((h: any) => ({
                    time: h.time,
                    temperature: toUserUnit(h.temperature) ?? 0,
                    condition: h.condition,
                    precipitation: h.precipitation ?? 0,
                  }));
                  return (
                    <AIBriefingHero
                      location={customDisplayName || actualStationName || selectedLocation?.name || "your location"}
                      currentTemp={toUserUnit(raw.temperature)}
                      feelsLike={toUserUnit(raw.feelsLike)}
                      condition={raw.condition}
                      hourly={normalizedHourly}
                      isImperial={isImperial}
                      streak={streakData?.currentStreak}

                      footer={
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className="group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                                </div>
                                <div className="text-left min-w-0">
                                  <div className="text-sm font-semibold text-white/95 truncate">View full briefing</div>
                                </div>
                              </div>
                              <span className="shrink-0 text-white/40 group-hover:text-white/70 transition-colors text-lg leading-none">→</span>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl p-0 overflow-hidden border-white/10 bg-gradient-to-b from-slate-950/95 via-slate-950/95 to-slate-900/95 backdrop-blur-2xl">
                            <div className="relative">
                              {/* Decorative gradient header */}
                              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/20 via-violet-500/10 to-transparent pointer-events-none" />
                              <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-blue-200" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-200/70">Rejn AI</div>
                                    <DialogTitle className="text-xl text-white">Extended Morning Review</DialogTitle>
                                  </div>
                                </div>
                              </DialogHeader>
                              <div className="relative max-h-[70vh] overflow-y-auto px-6 py-5">
                                <MorningWeatherReview
                                  weatherData={weatherData.mostAccurate}
                                  location={actualStationName}
                                  isImperial={isImperial}
                                  userId={user?.id}
                                  alwaysShow
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      }
                    />
                  );
                })()}
              </AnimatedCard>

              <AnimatedCard index={0}>
                <div className="relative">
                  <CurrentWeather
                    weatherData={weatherData.sources}
                    mostAccurate={weatherData.mostAccurate}
                    onRefresh={handleRefresh}
                    isLoading={isFetching}
                    lastUpdated={lastUpdated}
                    isImperial={isImperial}
                    isAutoDetected={isAutoDetected}
                    currentLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                    displayName={customDisplayName}
                    actualStationName={actualStationName}
                    premiumSettings={premiumSettings}
                    hourlyData={weatherData.mostAccurate.hourlyForecast}
                    is24Hour={is24Hour}
                  />
                  <SkyCamStationViewer
                    latitude={selectedLocation?.lat}
                    longitude={selectedLocation?.lon}
                  />
                </div>
              </AnimatedCard>

              {/* Share & AR Buttons */}
              <AnimatedCard index={1}>
                <div className="flex gap-2 mb-4">
                  <SocialWeatherCard
                    location={selectedLocation?.name || "Unknown"}
                    temperature={weatherData.mostAccurate.currentWeather.temperature}
                    feelsLike={weatherData.mostAccurate.currentWeather.feelsLike}
                    condition={weatherData.mostAccurate.currentWeather.condition}
                    humidity={weatherData.mostAccurate.currentWeather.humidity}
                    windSpeed={weatherData.mostAccurate.currentWeather.windSpeed}
                    isImperial={isImperial}
                    highTemp={weatherData.mostAccurate.dailyForecast?.[0]?.highTemp}
                    lowTemp={weatherData.mostAccurate.dailyForecast?.[0]?.lowTemp}
                    actualStationName={actualStationName}
                  />
                  <ARWeatherOverlay
                    windSpeed={weatherData.mostAccurate.currentWeather.windSpeed}
                    windDirection={weatherData.mostAccurate.currentWeather.windDirection || 0}
                    latitude={selectedLocation?.lat || 0}
                    longitude={selectedLocation?.lon || 0}
                    condition={weatherData.mostAccurate.currentWeather.condition}
                    uvIndex={weatherData.mostAccurate.currentWeather.uvIndex}
                    isImperial={isImperial}
                  />
                </div>
              </AnimatedCard>

              {/* Affiliate card */}
              <AnimatedCard index={2}>
                <AffiliateCard />
              </AnimatedCard>

              <AnimatedCard index={2}>
                <RouteSenseBanner
                  hourly={weatherData.mostAccurate.hourlyForecast}
                  is24Hour={is24Hour}
                />
                <PredictiveTimeline
                  hourly={weatherData.mostAccurate.hourlyForecast}
                  isImperial={isImperial}
                  is24Hour={is24Hour}
                />
              </AnimatedCard>

              <AnimatedCard index={3}>
                <TenDayForecast
                  key="tenDay"
                  dailyForecast={weatherData.mostAccurate.dailyForecast}
                  weatherSources={weatherData.sources}
                  hourlyForecast={weatherData.mostAccurate.hourlyForecast}
                  isImperial={isImperial}
                  is24Hour={is24Hour}
                  premiumSettings={premiumSettings}
                  location={customDisplayName || selectedLocation?.name || "your location"}
                />
              </AnimatedCard>

              {weatherData?.mostAccurate?.currentWeather?.pollenData && (
                <AnimatedCard index={4}>
                  <div className="mb-4">
                    <PollenCard
                      pollenData={weatherData.mostAccurate.currentWeather.pollenData}
                      userId={user?.id}
                      temperature={weatherData.mostAccurate.currentWeather.temperature}
                      windSpeed={weatherData.mostAccurate.currentWeather.windSpeed}
                      feelsLike={weatherData.mostAccurate.currentWeather.feelsLike}
                      snowfall={weatherData.mostAccurate.currentWeather.snowfall}
                      snowDepth={weatherData.mostAccurate.currentWeather.snowDepth}
                      condition={weatherData.mostAccurate.currentWeather.condition}
                      isImperial={isImperial}
                      latitude={selectedLocation?.lat}
                      longitude={selectedLocation?.lon}
                      hyperlocalSnow={hyperlocalData?.snow}
                    />
                  </div>
                </AnimatedCard>
              )}

              {/* Extended Morning Review moved to "View Extended Briefing" button on the AI hero */}

              <AnimatedCard index={7}>
                <DetailedMetrics
                  currentWeather={weatherData.mostAccurate.currentWeather}
                  hourlyForecast={weatherData.mostAccurate.hourlyForecast}
                  is24Hour={is24Hour}
                  premiumSettings={premiumSettings}
                />
                {hyperlocalData?.aqi ? (
                  <div className="mt-4">
                    <AQICard data={hyperlocalData.aqi} />
                  </div>
                ) : null}
              </AnimatedCard>

              {/* Rain map */}
              <AnimatedCard index={8}>
                <div className="mb-4">
                  <RainMapCard latitude={selectedLocation.lat} longitude={selectedLocation.lon} locationName={actualStationName} />
                </div>
              </AnimatedCard>




              {/* DryRoutes - embedded card experience */}
              <AnimatedCard index={9}>
                <Card className="glass-card mb-4 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">🗺️ DryRoutes</span>
                      <a href="/dryroutes" className="text-xs text-primary hover:underline flex items-center gap-1">
                        Full Screen →
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <iframe
                      src={`/dryroutes?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}&embed=true`}
                      title="DryRoutes"
                      className="w-full h-[300px] border-0"
                      allow="geolocation"
                    />
                  </CardContent>
                </Card>
              </AnimatedCard>


              {/* Holiday Calendars - only shown in season */}
              {new Date().getMonth() === 11 && (
                <div className="mb-4">
                  <ChristmasCalendar />
                </div>
              )}
              {(() => {
                const now = new Date();
                const ramadanStart = new Date(2026, 1, 18);
                const ramadanEnd = new Date(2026, 2, 21, 23, 59, 59);
                return now >= ramadanStart && now <= ramadanEnd;
              })() && (
                <div className="mb-4">
                  <RamadanCalendar
                    userLatitude={selectedLocation?.lat}
                    userLongitude={selectedLocation?.lon}
                    sunriseIso={weatherData.mostAccurate.currentWeather.sunriseIso}
                    sunsetIso={weatherData.mostAccurate.currentWeather.sunsetIso}
                  />
                </div>
              )}

              <footer className="text-center py-2 mt-4 glass-header rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-muted-foreground text-xs">
                    {t("footer.dataFrom")} <span className="font-medium text-foreground">ECMWF</span>,{" "}
                    <span className="font-medium text-foreground">GFS</span>,{" "}
                    <span className="font-medium text-foreground">DWD ICON</span>,{" "}
                    <span className="font-medium text-foreground">Open-meteo</span>, and{" "}
                    <span className="font-medium text-foreground">WeatherAPI</span>. {t("footer.disclaimer")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Button
                      onClick={handleRefresh}
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 h-5 px-1 text-xs"
                    >
                      🔄
                    </Button>
                  </div>
                </div>
              </footer>
              </div>
            </Suspense>
          ) : (
            <div className="transition-opacity duration-200 ease-out">
              <WeatherPageSkeleton />
            </div>
          )}
        </div>

        <Suspense fallback={null}>
          {/* Floating AI chat button removed — use the "Ask Rejn" tab in the bottom nav */}
          <BottomTabBar />
        </Suspense>
        
      </div>
    </>
  );
}
