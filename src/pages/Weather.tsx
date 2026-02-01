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
import { SEOHead } from "@/components/seo/seo-head";
import { Link } from "react-router-dom";

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
  const { settings: premiumSettings } = usePremiumSettings();
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
          time: h.time,
          temperature: h.temperature,
          condition: h.condition,
          precipitation: h.precipitation,
          icon: "",
        }));

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

        if (offlineCacheEnabled && data) {
          saveToCache(selectedLocation!.lat, selectedLocation!.lon, selectedLocation!.name, data);
        }

        return data;
      } catch (fetchError) {
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

  const getConvertedWeatherForAlerts = useMemo(() => {
    if (!weatherData?.mostAccurate?.currentWeather) return null;
    const raw = weatherData.mostAccurate.currentWeather;

    if (isImperial) {
      return { weather: raw, isImperial: true };
    } else {
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

  const locationDetectedRef = useRef(false);

  useEffect(() => {
    if (locationDetectedRef.current) return;

    const detectLocation = async () => {
      if (!navigator.onLine && offlineCacheEnabled) {
        try {
          const cachedLocation = await getFromCache(0, 0);
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
          return (
            data?.locality ||
            data?.city ||
            data?.principalSubdivision ||
            data?.principalSubdivisionCode ||
            data?.countryName ||
            "Current Location"
          );
        };

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
          console.warn("find-nearby-stations failed:", e);
        }

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
  }, [offlineCacheEnabled]);

  const handleLocationSelect = (lat: number, lon: number, locationName: string) => {
    const newLocation = { lat, lon, name: locationName };
    setSelectedLocation(newLocation);
    setIsAutoDetected(false);
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
        {/* ... all your existing content above footer unchanged ... */}

        {/* === FIXED FOOTER START === */}
        <footer className="text-center py-2 mt-4 glass-header rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-muted-foreground text-xs flex flex-wrap gap-2">
              <Link to="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/articles" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link to="/download" className="hover:text-foreground transition-colors">
                Download
              </Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/data-settings" className="hover:text-foreground transition-colors">
                Data & Privacy Settings
              </Link>
            </div>
            <div className="text-center md:text-right">
              <p>© 2025-{new Date().getFullYear()} Rainz. All rights reserved.</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/70">
              Disclaimer: Rainz is not affiliated with, endorsed by, or connected to Rains A/S or any of its
              subsidiaries or affiliates. "Rains" is a registered trademark of Rains A/S.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center mt-2">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 h-5 px-1 text-xs"
            >
              🔄
            </Button>
          </div>
        </footer>
        {/* === FIXED FOOTER END === */}
      </div>
    </>
  );
}
