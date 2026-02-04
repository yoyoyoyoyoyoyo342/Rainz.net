import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { useLLMWeatherForecast } from "@/hooks/use-llm-weather-forecast";
import { EmbedWeatherBackground, isSnowCondition } from "@/components/weather/embed-weather-background";
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Sunset, Droplets, Calendar, Clock } from "lucide-react";
import rainzLogo from "@/assets/rainz-logo-new.png";

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
    loading: "Loading...",
    basedOn: "Powered by",
  },
  da: {
    title: "Vejrudsigt",
    wind: "Vind",
    sunset: "Solnedgang",
    precip: "Nedbør",
    loading: "Indlæser...",
    basedOn: "Drevet af",
  },
};

function SkeletonWidget({ theme, t }: { theme: EmbedTheme; t: typeof translations.en }) {
  const isDark = theme === "dark";
  
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-sky-400'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10" />
      <div className="relative h-full flex flex-col p-4">
        {/* Glass header */}
        <div className={`flex items-center justify-center gap-2 mb-3 px-3 py-1.5 rounded-full mx-auto ${isDark ? 'bg-white/10' : 'bg-white/20'} backdrop-blur-sm`}>
          <div className={`w-12 h-3 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse mb-2`} />
          <div className={`w-16 h-8 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
        </div>
        
        {/* Metrics skeleton */}
        <div className={`flex items-center justify-center gap-4 py-2 px-3 rounded-xl ${isDark ? 'bg-black/20' : 'bg-white/20'} backdrop-blur-sm`}>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
              <div className={`w-8 h-2 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
            </div>
          ))}
        </div>
        
        {/* Footer skeleton */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <div className={`w-4 h-4 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
          <div className={`w-12 h-2 rounded ${isDark ? 'bg-white/20' : 'bg-white/30'} animate-pulse`} />
        </div>
      </div>
    </div>
  );
}

// Parse date param like "15/02/26" or "2026-02-15" to Date object
function parseDateParam(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
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
  const isDark = theme === "dark";

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

  const isLoading = location.loading || weatherLoading || llmLoading;

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonWidget theme={theme} t={t} />;
  }

  // Error state
  if (location.error && !location.lat) {
    return (
      <div className={`relative h-full w-full overflow-hidden rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-sky-400'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10" />
        <div className="relative h-full flex flex-col items-center justify-center p-4">
          <Cloud className="h-12 w-12 mb-2 text-white/50" />
          <p className="text-sm text-white/70">Location required</p>
          <a
            href="https://rainz.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-4 opacity-70 hover:opacity-100 transition-opacity"
          >
            <img src={rainzLogo} alt="Rainz" className="w-4 h-4 rounded" />
            <span className="text-[10px] text-white font-medium">Rainz.net</span>
          </a>
        </div>
      </div>
    );
  }

  // Get data from LLM forecast (AI-enhanced) with fallback to raw
  const rawCurrent = weatherData?.mostAccurate?.currentWeather;
  
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

    const daysDiff = Math.floor((forecastDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1 && llmForecast?.hourly?.length) {
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

    displayDateStr = forecastDate.toLocaleDateString(lang === "da" ? "da-DK" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    displayTimeStr = `${forecastHours.toString().padStart(2, "0")}:${(targetTime?.minutes ?? 0).toString().padStart(2, "0")}`;
  }

  const sunsetTime = rawCurrent?.sunset || "";

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
  const isSnow = isSnowCondition(displayCondition);
  
  // Text colors - black for snow, white for everything else
  const textPrimary = isSnow ? 'text-slate-900' : 'text-white';
  const textSecondary = isSnow ? 'text-slate-700' : 'text-white/80';
  const textMuted = isSnow ? 'text-slate-600' : 'text-white/70';
  const dropShadow = isSnow ? '' : 'drop-shadow-lg';
  const dropShadowSm = isSnow ? '' : 'drop-shadow-sm';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      {/* Animated weather background */}
      <EmbedWeatherBackground condition={displayCondition} theme={theme} />
      
      {/* Content overlay */}
      <div className="relative h-full flex flex-col p-4 z-10">
        {/* Glass header pill */}
        <div className={`flex items-center justify-center gap-2 mb-2 px-3 py-1.5 rounded-full mx-auto ${isSnow ? 'bg-slate-900/20' : (isDark ? 'bg-black/30' : 'bg-white/30')} backdrop-blur-md border ${isSnow ? 'border-slate-400/30' : (isDark ? 'border-white/10' : 'border-white/40')}`}>
          {isFutureForecast ? (
            <>
              {targetDate && (
                <span className={`text-[11px] flex items-center gap-1 ${textPrimary} font-medium ${dropShadowSm}`}>
                  <Calendar className="h-3 w-3" />
                  {displayDateStr}
                </span>
              )}
              {targetDate && targetTime && <span className={isSnow ? 'text-slate-500' : 'text-white/60'}>•</span>}
              {targetTime && (
                <span className={`text-[11px] flex items-center gap-1 ${textPrimary} font-medium ${dropShadowSm}`}>
                  <Clock className="h-3 w-3" />
                  {displayTimeStr}
                </span>
              )}
            </>
          ) : (
            <p className={`text-[11px] ${textPrimary} font-medium ${dropShadowSm}`}>{t.title}</p>
          )}
        </div>

        {/* Weather icon and temperature - centered */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <ConditionIcon className={`h-12 w-12 mb-1 ${textPrimary} ${dropShadow}`} />
          <span className={`text-4xl font-bold ${textPrimary} ${dropShadow} tracking-tight`}>
            {formatTemp(displayTemp)}
          </span>
          <span className={`text-xs ${textSecondary} mt-1 capitalize ${dropShadowSm}`}>
            {displayCondition}
          </span>
        </div>

        {/* Metrics row - glass card */}
        <div className={`flex items-center justify-center gap-4 py-2 px-3 rounded-xl ${isSnow ? 'bg-slate-900/15' : (isDark ? 'bg-black/30' : 'bg-white/25')} backdrop-blur-md border ${isSnow ? 'border-slate-400/20' : (isDark ? 'border-white/10' : 'border-white/30')}`}>
          <div className="flex flex-col items-center">
            <Wind className={`h-3.5 w-3.5 mb-0.5 ${textSecondary}`} />
            <span className={`text-[9px] ${textMuted}`}>{t.wind}</span>
            <span className={`text-xs font-semibold ${textPrimary} ${dropShadowSm}`}>{formatWind(displayWind)}</span>
          </div>
          <div className={`w-px h-8 ${isSnow ? 'bg-slate-400/30' : (isDark ? 'bg-white/20' : 'bg-white/40')}`} />
          <div className="flex flex-col items-center">
            <Sunset className={`h-3.5 w-3.5 mb-0.5 ${textSecondary}`} />
            <span className={`text-[9px] ${textMuted}`}>{t.sunset}</span>
            <span className={`text-xs font-semibold ${textPrimary} ${dropShadowSm}`}>{formatSunset(sunsetTime)}</span>
          </div>
          <div className={`w-px h-8 ${isSnow ? 'bg-slate-400/30' : (isDark ? 'bg-white/20' : 'bg-white/40')}`} />
          <div className="flex flex-col items-center">
            <Droplets className={`h-3.5 w-3.5 mb-0.5 ${textSecondary}`} />
            <span className={`text-[9px] ${textMuted}`}>{t.precip}</span>
            <span className={`text-xs font-semibold ${textPrimary} ${dropShadowSm}`}>{displayPrecip} mm</span>
          </div>
        </div>

        {/* Footer branding */}
        <a
          href="https://rainz.net"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          <img src={rainzLogo} alt="Rainz" className="w-4 h-4 rounded shadow-sm" />
          <span className={`text-[10px] ${textPrimary} font-medium ${dropShadowSm}`}>Rainz.net</span>
        </a>
      </div>
    </div>
  );
}
