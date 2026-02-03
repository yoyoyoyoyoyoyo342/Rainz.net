import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { useLLMWeatherForecast } from "@/hooks/use-llm-weather-forecast";
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Sunset, Droplets, Calendar, Clock } from "lucide-react";
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

// Parse date param like "15/02/26" or "2026-02-15" to Date object
function parseDateParam(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    // Handle DD/MM/YY format
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
      }
    }
    // Handle YYYY-MM-DD format
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {}
  return null;
}

// Parse time param like "10:00" to hours and minutes
function parseTimeParam(timeStr: string | null): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      return {
        hours: parseInt(parts[0]),
        minutes: parseInt(parts[1]),
      };
    }
  } catch {}
  return null;
}

export default function EmbedPage() {
  const [searchParams] = useSearchParams();
  const paramLat = searchParams.get("lat");
  const paramLon = searchParams.get("lon");
  const paramLocation = searchParams.get("location");
  const theme = (searchParams.get("theme") || "light") as EmbedTheme;
  const lang = (searchParams.get("lang") || "en") as EmbedLang;
  const units = searchParams.get("units") || "metric";
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const t = translations[lang] || translations.en;

  // Parse forecast date/time from URL params
  const targetDate = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const targetTime = useMemo(() => parseTimeParam(timeParam), [timeParam]);
  const isFutureForecast = !!targetDate || !!targetTime;

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
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
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

  // Prepare sources for LLM forecast
  const sources = useMemo(() => {
    if (!weatherData?.sources) return undefined;
    return weatherData.sources.map(s => ({
      source: s.source,
      currentWeather: s.currentWeather,
      hourlyForecast: s.hourlyForecast,
      dailyForecast: s.dailyForecast,
    }));
  }, [weatherData?.sources]);

  // Fetch AI-enhanced weather data
  const { data: llmForecast, isLoading: llmLoading } = useLLMWeatherForecast(
    sources,
    location.name,
    !!sources && sources.length > 0
  );

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

  // Get data from LLM forecast (AI-enhanced) with fallback to raw
  const rawCurrent = weatherData?.mostAccurate?.currentWeather;
  
  // Determine which forecast data to use based on date/time params
  let displayTemp = llmForecast?.current?.temperature ?? rawCurrent?.temperature ?? 0;
  let displayCondition = llmForecast?.current?.condition ?? rawCurrent?.condition ?? "Unknown";
  let displayWind = llmForecast?.current?.windSpeed ?? rawCurrent?.windSpeed ?? 0;
  let displayPrecip = 0;
  let displayDateStr = "";
  let displayTimeStr = "";

  // If specific date/time requested, find matching forecast
  if (isFutureForecast) {
    const now = new Date();
    const forecastDate = targetDate || now;
    const forecastHours = targetTime?.hours ?? now.getHours();

    // Check if we need hourly or daily forecast
    const daysDiff = Math.floor((forecastDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1 && llmForecast?.hourly?.length) {
      // Find matching hour in hourly forecast
      const targetHour = forecastHours;
      const hourlyMatch = llmForecast.hourly.find(h => {
        try {
          const hDate = new Date(h.time);
          return hDate.getHours() === targetHour;
        } catch {
          return false;
        }
      });
      
      if (hourlyMatch) {
        displayTemp = hourlyMatch.temperature;
        displayCondition = hourlyMatch.condition;
        displayPrecip = hourlyMatch.precipitation || 0;
      }
    } else if (llmForecast?.daily?.length) {
      // Find matching day in daily forecast
      const targetDayStr = forecastDate.toLocaleDateString("en-US", { weekday: "short" });
      const dailyMatch = llmForecast.daily.find(d => 
        d.day?.toLowerCase().includes(targetDayStr.toLowerCase())
      );
      
      if (dailyMatch) {
        displayTemp = (dailyMatch.highTemp + dailyMatch.lowTemp) / 2;
        displayCondition = dailyMatch.condition;
        displayPrecip = dailyMatch.precipitation || 0;
      }
    }

    // Format display strings
    displayDateStr = forecastDate.toLocaleDateString(lang === "da" ? "da-DK" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    displayTimeStr = `${forecastHours.toString().padStart(2, "0")}:${(targetTime?.minutes ?? 0).toString().padStart(2, "0")}`;
  }

  // Get sunset from raw weather data
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
      if (isNaN(date.getTime())) return time;
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
      {/* Title with forecast date/time */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {isFutureForecast ? (
          <>
            {targetDate && (
              <span className={`text-xs flex items-center gap-1 ${secondaryTextClass}`}>
                <Calendar className="h-3 w-3" />
                {displayDateStr}
              </span>
            )}
            {targetDate && targetTime && <span className={secondaryTextClass}>•</span>}
            {targetTime && (
              <span className={`text-xs flex items-center gap-1 ${secondaryTextClass}`}>
                <Clock className="h-3 w-3" />
                {displayTimeStr}
              </span>
            )}
          </>
        ) : (
          <p className={`text-xs ${secondaryTextClass}`}>{t.title}</p>
        )}
      </div>

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
