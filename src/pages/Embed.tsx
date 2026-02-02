import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Sunset, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    basedOn: "Based on data from",
  },
  da: {
    title: "Vejrudsigt",
    wind: "Vind",
    sunset: "Solnedgang",
    precip: "Nedbør",
    basedOn: "Baseret på data fra",
  },
};

function SkeletonWidget({ theme, t }: { theme: EmbedTheme; t: typeof translations.en }) {
  const themeClasses = theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const secondaryTextClass = theme === "dark" ? "text-gray-400" : "text-gray-500";
  const borderClass = theme === "dark" ? "border-gray-700" : "border-gray-200";

  return (
    <div className={`p-4 ${themeClasses}`}>
      <p className={`text-xs text-center mb-3 ${secondaryTextClass}`}>{t.title}</p>
      
      <div className="flex flex-col items-center mb-4">
        <Skeleton className="h-12 w-12 rounded-full mb-2" />
        <Skeleton className="h-10 w-20" />
      </div>

      <div className={`flex items-center justify-center gap-6 text-center border-t ${borderClass} pt-3 mb-3`}>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>

      <div className={`text-center border-t ${borderClass} pt-2`}>
        <span className={`text-[10px] ${secondaryTextClass}`}>
          {t.basedOn} <span className="font-medium">Rainz.net</span>
        </span>
      </div>
    </div>
  );
}

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
      if (!paramLocation) {
        reverseGeocode(parseFloat(paramLat), parseFloat(paramLon));
      }
      return;
    }

    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: "Geolocation not supported" }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({ ...prev, lat: latitude, lon: longitude, loading: false }));
        await reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocation(prev => ({ ...prev, loading: false, error: error.message }));
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

  // Theme classes
  const themeClasses = theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const secondaryTextClass = theme === "dark" ? "text-gray-400" : "text-gray-500";
  const borderClass = theme === "dark" ? "border-gray-700" : "border-gray-200";

  const isLoading = location.loading || weatherLoading || llmLoading;

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonWidget theme={theme} t={t} />;
  }

  // Error state - still show skeleton structure with error
  if (location.error && !location.lat) {
    return (
      <div className={`p-4 ${themeClasses}`}>
        <p className={`text-xs text-center mb-3 ${secondaryTextClass}`}>{t.title}</p>
        <div className="flex flex-col items-center mb-4">
          <Cloud className="h-12 w-12 mb-2 opacity-30" />
          <p className={`text-sm ${secondaryTextClass}`}>Location required</p>
        </div>
        <div className={`text-center border-t ${borderClass} pt-2`}>
          <a href="https://rainz.net" target="_blank" rel="noopener noreferrer" className={`text-[10px] ${secondaryTextClass} hover:opacity-80`}>
            {t.basedOn} <span className="font-medium">Rainz.net</span>
          </a>
        </div>
      </div>
    );
  }

  // Get data from raw weather (LLM may still be loading or failed)
  const rawCurrent = weatherData?.mostAccurate?.currentWeather;
  const displayTemp = llmForecast?.current?.temperature ?? rawCurrent?.temperature ?? 0;
  const displayCondition = llmForecast?.current?.condition ?? rawCurrent?.condition ?? "Unknown";
  const displayWind = llmForecast?.current?.windSpeed ?? rawCurrent?.windSpeed ?? 0;
  const displayPrecip = rawCurrent?.precipitation ?? 0;
  const sunsetTime = rawCurrent?.sunset || "";

  // Format functions
  const formatTemp = (tempF: number) => {
    if (units === "imperial") return `${Math.round(tempF)}°F`;
    return `${Math.round((tempF - 32) * 5 / 9)}°C`;
  };

  const formatWind = (speedMph: number) => {
    if (units === "imperial") return `${Math.round(speedMph)} mph`;
    return `${(speedMph * 0.44704).toFixed(1)} m/s`;
  };

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

  const ConditionIcon = getConditionIcon(displayCondition);

  return (
    <div className={`p-4 ${themeClasses}`}>
      {/* Title */}
      <p className={`text-xs text-center mb-3 ${secondaryTextClass}`}>{t.title}</p>

      {/* Weather icon and temperature */}
      <div className="flex flex-col items-center mb-4">
        <ConditionIcon className="h-12 w-12 mb-1 opacity-70" />
        <span className="text-4xl font-light">{formatTemp(displayTemp)}</span>
      </div>

      {/* Metrics row */}
      <div className={`flex items-center justify-center gap-6 text-center border-t ${borderClass} pt-3 mb-3`}>
        <div className="flex flex-col items-center">
          <Wind className={`h-3 w-3 mb-0.5 ${secondaryTextClass}`} />
          <span className={`text-[10px] ${secondaryTextClass}`}>{t.wind}</span>
          <span className="text-xs font-medium">{formatWind(displayWind)}</span>
        </div>
        <div className="flex flex-col items-center">
          <Sunset className={`h-3 w-3 mb-0.5 ${secondaryTextClass}`} />
          <span className={`text-[10px] ${secondaryTextClass}`}>{t.sunset}</span>
          <span className="text-xs font-medium">{formatSunset(sunsetTime)}</span>
        </div>
        <div className="flex flex-col items-center">
          <Droplets className={`h-3 w-3 mb-0.5 ${secondaryTextClass}`} />
          <span className={`text-[10px] ${secondaryTextClass}`}>{t.precip}</span>
          <span className="text-xs font-medium">{displayPrecip} mm</span>
        </div>
      </div>

      {/* Footer branding */}
      <div className={`text-center border-t ${borderClass} pt-2`}>
        <a
          href="https://rainz.net"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] ${secondaryTextClass} hover:opacity-80 transition-opacity`}
        >
          {t.basedOn} <span className="font-medium">Rainz.net</span>
        </a>
      </div>
    </div>
  );
}
