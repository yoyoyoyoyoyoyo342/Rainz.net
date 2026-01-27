import React, { useState, useEffect, useMemo, useRef } from "react";
import { CloudSun, LogIn, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { weatherApi } from "@/lib/weather-api";
import { LocationSearch } from "@/components/weather/location-search";
import { CurrentWeather } from "@/components/weather/current-weather";
import { TenDayForecast } from "@/components/weather/ten-day-forecast";
import { DetailedMetrics } from "@/components/weather/detailed-metrics";
import { PollenCard } from "@/components/weather/pollen-card";
import { SettingsDialog } from "@/components/weather/settings-dialog";
import { WeatherReportForm } from "@/components/weather/weather-report-form";
import { WeatherResponse } from "@/types/weather";
import { checkWeatherAlerts } from "@/lib/weather-alerts";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { AIChatButton } from "@/components/weather/ai-chat-button";
import { AnimatedWeatherBackground } from "@/components/weather/animated-weather-background";
import { HolidayBackground, getCurrentHoliday } from "@/components/weather/holiday-backgrounds";
import { MorningWeatherReview } from "@/components/weather/morning-weather-review";
import { WinterAlerts } from "@/components/weather/winter-alerts";
import { WeatherStationInfo } from "@/components/weather/weather-station-info";
import { LockedFeature } from "@/components/ui/locked-feature";
import { useLanguage } from "@/contexts/language-context";
import { SocialWeatherCard } from "@/components/weather/social-weather-card";
import { ARWeatherOverlay } from "@/components/weather/ar-weather-overlay";
import { WeatherTrendsCard } from "@/components/weather/weather-trends-card";
import { PredictionDialog } from "@/components/weather/prediction-dialog";
import { useTimeOfDay } from "@/hooks/use-time-of-day";
import { useTimeOfDayContext } from "@/contexts/time-of-day-context";
import { LockedPredictionButton } from "@/components/weather/locked-prediction-button";
import { useHyperlocalWeather } from "@/hooks/use-hyperlocal-weather";
import { AQICard } from "@/components/weather/aqi-card";
import { BarometerCard } from "@/components/weather/barometer-card";
import { MobileLocationNav } from "@/components/weather/mobile-location-nav";
import { HeaderInfoBar } from "@/components/weather/header-info-bar";
import RainMapCard from "@/components/weather/rain-map-card";
import { usePremiumSettings } from "@/hooks/use-premium-settings";
import { AffiliateCard } from "@/components/weather/affiliate-card";
import { trackWeatherView } from "@/lib/track-event";
import { ExtendedMoonCard } from "@/components/weather/extended-moon-card";
import { useAccountStorage } from "@/hooks/use-account-storage";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";
import { useOfflineCache } from "@/hooks/use-offline-cache";
import { InlineAd } from "@/components/ui/inline-ad";
import { SEOHead } from "@/components/seo/seo-head";

export default function WeatherPage() {
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
  const { visibleCards, cardOrder, is24Hour, isHighContrast } = useUserPreferences();
  const { t } = useLanguage();
  const { setTimeOfDay } = useTimeOfDayContext();
  const { settings: premiumSettings, isSubscribed } = usePremiumSettings();
  const { data: hyperlocalData } = useHyperlocalWeather(selectedLocation?.lat, selectedLocation?.lon);
  const { setUserLocation: saveLocationToAccount } = useAccountStorage();
  const { saveToCache, getFromCache, isEnabled: offlineCacheEnabled } = useOfflineCache();
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const currentHoliday = getCurrentHoliday();

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

  const {
    data: weatherData,
    isLoading,
    isFetching,
    error,
  } = useQuery<WeatherResponse, Error>({
    queryKey: ["/api/weather", selectedLocation?.lat, selectedLocation?.lon, selectedLocation?.name],
    enabled: !!selectedLocation,
    queryFn: async () => {
      // Special handling for World Average
      if (selectedLocation?.name === "World Average") {
        const { data, error } = await supabase.functions.invoke("world-weather-average", {
          body: { isImperial },
        });

        if (error) throw error;

        // Transform world data to match WeatherResponse structure
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

        // Transform hourly forecast
        const hourlyForecast = (worldData.hourlyForecast || []).map((h: any) => ({
          time: h.time,
          temperature: h.temperature,
          condition: h.condition,
          precipitation: h.precipitation,
          icon: "",
        }));

        // Transform daily forecast
        const dailyForecast = (worldData.dailyForecast || []).map((d: any) => ({
          day: d.day,
          condition: d.condition,
          description: d.condition,
          highTemp: d.highTemp,
          lowTemp: d.lowTemp,
          precipitation: d.precipitation,
          icon: "",
        }));

        const transformedData: WeatherResponse = {
          mostAccurate: {
            currentWeather: baseCurrentWeather,
            source: "World Average",
            location: "World",
            latitude: 0,
            longitude: 0,
            accuracy: 100,
            hourlyForecast,
            dailyForecast,
          },
          sources: [],
          aggregated: {
            currentWeather: baseCurrentWeather,
            source: "World Average",
            location: "World",
            latitude: 0,
            longitude: 0,
            accuracy: 100,
            hourlyForecast,
            dailyForecast,
          },
        };

        setIsUsingCachedData(false);
        return transformedData;
      }

      try {
        const data = await weatherApi.getWeatherData(
          selectedLocation!.lat,
          selectedLocation!.lon,
          selectedLocation!.name,
        );
        setIsUsingCachedData(false);

        // Save to offline cache for premium users
        if (offlineCacheEnabled && data) {
          saveToCache(selectedLocation!.lat, selectedLocation!.lon, selectedLocation!.name, data);
        }

        return data;
      } catch (fetchError) {
        // Try to use cached data if fetch fails (premium feature)
        if (offlineCacheEnabled) {
          const cached = await getFromCache(selectedLocation!.lat, selectedLocation!.lon);
          if (cached) {
            setIsUsingCachedData(true);
            toast({
              title: "Using cached data",
              description: `Showing weather from ${new Date(cached.timestamp).toLocaleTimeString()}`,
            });
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

  const sunrise = weatherData?.mostAccurate?.currentWeather?.sunrise;
  const sunset = weatherData?.mostAccurate?.currentWeather?.sunset;
  const timeOfDay = useTimeOfDay(sunrise, sunset);

  useEffect(() => {
    setTimeOfDay(timeOfDay);
  }, [timeOfDay, setTimeOfDay]);

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
    // Only detect location once per session
    if (locationDetectedRef.current) return;

    const detectLocation = async () => {
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

      try {
        const position = await weatherApi.getCurrentLocation();
        const { latitude, longitude } = position.coords;

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
      } catch {
        // ignore
      }
    };

    detectLocation();
  }, [offlineCacheEnabled]); // Add offlineCacheEnabled dependency

  const handleLocationSelect = (lat: number, lon: number, locationName: string) => {
    const newLocation = { lat, lon, name: locationName };
    setSelectedLocation(newLocation);
    setIsAutoDetected(false);
    // Save to account for logged-in users, localStorage for guests
    saveLocationToAccount(newLocation);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <SEOHead
        title={
          selectedLocation
            ? `${selectedLocation.name} Weather - Rainz Weather`
            : "Rainz Weather - AI-Powered Hyper-Local Weather Forecasts"
        }
        description={
          selectedLocation
            ? `Get accurate AI-enhanced weather forecast for ${selectedLocation.name}. Current conditions, hourly forecast, 10-day outlook, pollen levels, and severe weather alerts.`
            : "Get accurate AI-powered weather forecasts with Rainz Weather. Hyper-local predictions, pollen tracking, weather alerts, and gamified weather predictions. Free weather app."
        }
        keywords={`Rainz Weather, ${selectedLocation?.name || "local"} weather, weather forecast, AI weather, pollen tracker, weather alerts, accurate weather`}
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
              <AnimatedWeatherBackground
                condition={weatherData?.mostAccurate?.currentWeather?.condition}
                sunrise={weatherData?.mostAccurate?.currentWeather?.sunrise}
                sunset={weatherData?.mostAccurate?.currentWeather?.sunset}
                moonPhase={weatherData?.mostAccurate?.currentWeather?.moonPhase}
              />
            )}
          </>
        )}

        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl relative z-10">
          <Card className="mb-6 relative z-[1000] overflow-hidden rounded-2xl glass-card-strong">
            <div className="p-4 sm:p-6 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                    Rainz Weather
                  </h1>
                  <p className="text-sm text-muted-foreground">Be prepared.</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <HeaderInfoBar user={user} />
                  <LockedFeature isLocked={!user}>
                    <SettingsDialog
                      isImperial={isImperial}
                      onUnitsChange={setIsImperial}
                      mostAccurate={weatherData?.mostAccurate}
                    />
                  </LockedFeature>
                  {!user && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => (window.location.href = "/auth")}
                      className="gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{t("header.signIn")}</span>
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border/60">
                    <span className="text-sm font-medium text-foreground">°F</span>
                    <Switch checked={!isImperial} onCheckedChange={(checked) => setIsImperial(!checked)} />
                    <span className="text-sm font-medium text-foreground">°C</span>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 bg-card space-y-4">
              {/* Offline cache indicator for premium users */}
              {isUsingCachedData && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">
                    Using cached weather data • Last updated {lastUpdated?.toLocaleTimeString()}
                  </span>
                </div>
              )}

              <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-start">
                <div className="space-y-2">
                  <LocationSearch onLocationSelect={handleLocationSelect} isImperial={isImperial} />
                  {weatherData?.aggregated?.stationInfo && (
                    <WeatherStationInfo stationInfo={weatherData.aggregated.stationInfo} />
                  )}
                </div>
                {weatherData && (
                  <WeatherReportForm
                    location={actualStationName}
                    currentCondition={weatherData.mostAccurate.currentWeather.condition}
                    locationData={{ latitude: selectedLocation?.lat || 0, longitude: selectedLocation?.lon || 0 }}
                  />
                )}
              </div>

              {selectedLocation && (
                <div className="pt-3 border-t border-border/20">
                  {user ? (
                    <PredictionDialog
                      location={selectedLocation?.name || "Unknown"}
                      latitude={selectedLocation?.lat || 0}
                      longitude={selectedLocation?.lon || 0}
                      isImperial={isImperial}
                      onPredictionMade={() => {}}
                    />
                  ) : (
                    <LockedFeature isLocked={true}>
                      <LockedPredictionButton />
                    </LockedFeature>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {selectedLocation && isLoading && !weatherData ? (
            <WeatherPageSkeleton />
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
            <>
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

              {/* Share & AR Buttons */}
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

              {/* Requested card order */}
              {!isSubscribed && <AffiliateCard />}

              <TenDayForecast
                key="tenDay"
                dailyForecast={weatherData.mostAccurate.dailyForecast}
                weatherSources={weatherData.sources}
                hourlyForecast={weatherData.mostAccurate.hourlyForecast}
                isImperial={isImperial}
                is24Hour={is24Hour}
                premiumSettings={premiumSettings}
              />

              {weatherData?.mostAccurate?.currentWeather?.pollenData && (
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
                    hyperlocalSnow={hyperlocalData?.snow}
                  />
                </div>
              )}

              <MorningWeatherReview
                weatherData={weatherData.mostAccurate}
                location={actualStationName}
                isImperial={isImperial}
                userId={user?.id}
              />

              <InlineAd />

              <div className="mb-4">
                <RainMapCard latitude={selectedLocation.lat} longitude={selectedLocation.lon} locationName={actualStationName} />
              </div>

              <div className="mb-4">
                <LockedFeature isLocked={!user}>
                  <WeatherTrendsCard
                    currentWeather={weatherData.mostAccurate.currentWeather}
                    location={actualStationName}
                    latitude={selectedLocation.lat}
                    longitude={selectedLocation.lon}
                    isImperial={isImperial}
                  />
                </LockedFeature>
              </div>

              <div className="mb-4">
                <DetailedMetrics
                  currentWeather={weatherData.mostAccurate.currentWeather}
                  is24Hour={is24Hour}
                  premiumSettings={premiumSettings}
                />
                {isSubscribed && selectedLocation && (
                  <ExtendedMoonCard
                    moonrise={weatherData.mostAccurate.currentWeather.moonrise}
                    moonset={weatherData.mostAccurate.currentWeather.moonset}
                    moonPhase={weatherData.mostAccurate.currentWeather.moonPhase}
                    latitude={selectedLocation.lat}
                    longitude={selectedLocation.lon}
                    is24Hour={is24Hour}
                  />
                )}
              </div>

              {hyperlocalData?.aqi ? (
                <div className="mb-4">
                  <AQICard data={hyperlocalData.aqi} />
                </div>
              ) : null}

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
            </>
          ) : null}
        </div>

        {weatherData && (
          <AIChatButton
            weatherData={weatherData.mostAccurate}
            location={selectedLocation.name}
            isImperial={isImperial}
          />
        )}
        {user && (
          <MobileLocationNav
            onLocationSelect={handleLocationSelect}
            currentLocation={selectedLocation}
            isImperial={isImperial}
          />
        )}
      </div>
    </>
  );
}
