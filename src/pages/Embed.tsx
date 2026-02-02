import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Sunset, Droplets } from "lucide-react";

type EmbedTheme = "light" | "dark";
type EmbedLang = "en" | "da";

interface LocationState {
  lat: number | null;
  lon: number | null;
  name: string;
  loading: boolean;
  error: string | null;
}

interface LLMForecastData {
  current: {
    temperature: number;
    feelsLike: number;
    condition: string;
    description: string;
    humidity: number;
    windSpeed: number;
    pressure: number;
    confidence: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitation: number;
    confidence: number;
  }>;
  daily: Array<{
    day: string;
    condition: string;
    description: string;
    highTemp: number;
    lowTemp: number;
    precipitation: number;
    confidence: number;
  }>;
  summary: string;
  modelAgreement: number;
  insights: string[];
  rawApiData?: boolean;
  source?: string;
}

const getConditionIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
  if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return Snowflake;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return Cloud;
  return Sun;
};

const translations = {
  en: {
    title: "Weather Forecast",
    wind: "Wind",
    sunset: "Sunset",
    precip: "Precip",
    loading: "Loading...",
    locationRequired: "Location required",
    enableLocation: "Please enable location access",
    basedOn: "Based on data from",
  },
  da: {
    title: "Vejrudsigt",
    wind: "Vind",
    sunset: "Solnedgang",
    precip: "Nedbør",
    loading: "Indlæser...",
    locationRequired: "Placering påkrævet",
    enableLocation: "Aktiver venligst placeringsadgang",
    basedOn: "Baseret på data fra",
  },
};

export default function EmbedPage() {
  const [searchParams] = useSearchParams();
  const paramLat = searchParams.get("lat");
  const paramLon = searchParams.get("lon");
  const paramLocation = searchParams.get("location");
  const theme = (searchParams.get("theme") || "light") as EmbedTheme;
  const lang = (searchParams.get("lang") || "en") as EmbedLang;
  const units = searchParams.get("units") || "metric";

  const t = translations[lang] || translations.en;

  const [location, setLocation] = useState<LocationState>({
    lat: paramLat ? parseFloat(paramLat) : null,
    lon: paramLon ? parseFloat(paramLon) : null,
    name: paramLocation || "",
    loading: !paramLat || !paramLon,
    error: null,
  });

  // Auto-detect location if not provided via URL params
  useEffect(() => {
    if (paramLat && paramLon) {
      // If location name not provided, reverse geocode
      if (!paramLocation) {
        reverseGeocode(parseFloat(paramLat), parseFloat(paramLon));
      }
      return;
    }

    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: "Geolocation not supported",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          loading: false,
        }));
        await reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocation(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [paramLat, paramLon, paramLocation]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
      );
      const data = await response.json();
      const name = data.locality || data.city || data.principalSubdivision || "Unknown";
      setLocation(prev => ({ ...prev, name }));
    } catch (error) {
      console.error("Reverse geocode error:", error);
      setLocation(prev => ({ ...prev, name: "Unknown Location" }));
    }
  };

  // Fetch raw weather data
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["embed-weather", location.lat, location.lon],
    queryFn: () => weatherApi.getWeatherData(location.lat!, location.lon!, location.name),
    enabled: !!location.lat && !!location.lon && !location.loading,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  // Transform sources for LLM
  const sources = weatherData?.sources?.map(source => ({
    source: source.source,
    currentWeather: {
      temperature: source.currentWeather?.temperature || 0,
      condition: source.currentWeather?.condition || "Unknown",
      humidity: source.currentWeather?.humidity || 0,
      windSpeed: source.currentWeather?.windSpeed || 0,
      feelsLike: source.currentWeather?.feelsLike || 0,
      pressure: source.currentWeather?.pressure || 1013,
    },
    hourlyForecast: source.hourlyForecast?.slice(0, 24).map(h => ({
      time: h.time,
      temperature: h.temperature,
      condition: h.condition,
      precipitation: h.precipitation || 0,
    })) || [],
    dailyForecast: source.dailyForecast?.slice(0, 7).map(d => ({
      day: d.day,
      condition: d.condition,
      highTemp: d.highTemp,
      lowTemp: d.lowTemp,
      precipitation: d.precipitation || 0,
    })) || [],
  }));

  // Fetch AI-enhanced forecast
  const { data: llmForecast, isLoading: llmLoading } = useQuery<LLMForecastData>({
    queryKey: ["embed-llm-forecast", location.name, sources?.length],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("llm-weather-forecast", {
        body: { sources, location: location.name },
      });
      if (error) throw error;
      return data as LLMForecastData;
    },
    enabled: !!sources && sources.length > 0 && !!location.name,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Get sunset from raw weather data
  const rawCurrent = weatherData?.mostAccurate?.currentWeather;
  const sunsetTime = rawCurrent?.sunset || "";

  // Format temperature
  const formatTemp = (tempF: number) => {
    if (units === "imperial") return `${Math.round(tempF)}°F`;
    return `${Math.round((tempF - 32) * 5 / 9)}°C`;
  };

  // Format wind speed
  const formatWind = (speedMph: number) => {
    if (units === "imperial") return `${Math.round(speedMph)} mph`;
    return `${(speedMph * 1.60934).toFixed(1)} km/h`;
  };

  // Format sunset time
  const formatSunset = (time: string) => {
    if (!time) return "--:--";
    try {
      const date = new Date(time);
      return date.toLocaleTimeString(lang === "da" ? "da-DK" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return time;
    }
  };

  const isLoading = location.loading || weatherLoading || llmLoading;

  // Theme classes
  const themeClasses = theme === "dark"
    ? "bg-gray-900 text-white"
    : "bg-white text-gray-900";

  const secondaryTextClass = theme === "dark"
    ? "text-gray-400"
    : "text-gray-500";

  const borderClass = theme === "dark"
    ? "border-gray-700"
    : "border-gray-200";

  // Error state
  if (location.error && !location.lat) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-4 ${themeClasses}`}>
        <Cloud className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">{t.locationRequired}</p>
        <p className={`text-sm ${secondaryTextClass}`}>{t.enableLocation}</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-4 ${themeClasses}`}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-current/10 mb-3" />
          <div className="h-4 w-24 rounded bg-current/10" />
        </div>
        <p className={`text-sm mt-3 ${secondaryTextClass}`}>{t.loading}</p>
      </div>
    );
  }

  // Get display data from LLM forecast or fall back to raw
  const displayTemp = llmForecast?.current?.temperature ?? rawCurrent?.temperature ?? 0;
  const displayCondition = llmForecast?.current?.condition ?? rawCurrent?.condition ?? "Unknown";
  const displayWind = llmForecast?.current?.windSpeed ?? rawCurrent?.windSpeed ?? 0;
  const displayPrecip = rawCurrent?.precipitation ?? 0;

  const ConditionIcon = getConditionIcon(displayCondition);

  return (
    <div className={`h-screen w-screen flex flex-col ${themeClasses}`}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Title */}
        <h1 className={`text-sm font-medium mb-4 ${secondaryTextClass}`}>
          {t.title}
        </h1>

        {/* Weather icon and temperature */}
        <div className="flex flex-col items-center mb-6">
          <ConditionIcon className="h-16 w-16 mb-2 opacity-80" />
          <span className="text-5xl font-light">
            {formatTemp(displayTemp)}
          </span>
        </div>

        {/* Metrics row */}
        <div className={`flex items-center justify-center gap-8 text-center border-t ${borderClass} pt-4 w-full max-w-xs`}>
          <div className="flex flex-col items-center">
            <Wind className={`h-4 w-4 mb-1 ${secondaryTextClass}`} />
            <span className={`text-xs ${secondaryTextClass}`}>{t.wind}</span>
            <span className="text-sm font-medium">{formatWind(displayWind)}</span>
          </div>
          <div className="flex flex-col items-center">
            <Sunset className={`h-4 w-4 mb-1 ${secondaryTextClass}`} />
            <span className={`text-xs ${secondaryTextClass}`}>{t.sunset}</span>
            <span className="text-sm font-medium">{formatSunset(sunsetTime)}</span>
          </div>
          <div className="flex flex-col items-center">
            <Droplets className={`h-4 w-4 mb-1 ${secondaryTextClass}`} />
            <span className={`text-xs ${secondaryTextClass}`}>{t.precip}</span>
            <span className="text-sm font-medium">{displayPrecip} mm</span>
          </div>
        </div>
      </div>

      {/* Footer branding */}
      <div className={`py-3 text-center border-t ${borderClass}`}>
        <a
          href="https://rainz.net"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${secondaryTextClass} hover:opacity-80 transition-opacity`}
        >
          {t.basedOn} <span className="font-medium">Rainz.net</span>
        </a>
      </div>
    </div>
  );
}
