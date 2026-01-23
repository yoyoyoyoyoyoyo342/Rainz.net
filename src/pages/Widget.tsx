import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind, Droplets, Thermometer } from "lucide-react";

type WidgetTheme = "light" | "dark" | "glass" | "minimal";
type WidgetSize = "small" | "medium" | "large";

const getConditionIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
  if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return Snowflake;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return Cloud;
  return Sun;
};

export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lon = parseFloat(searchParams.get("lon") || "0");
  const locationName = searchParams.get("location") || "Weather";
  const theme = (searchParams.get("theme") || "light") as WidgetTheme;
  const size = (searchParams.get("size") || "medium") as WidgetSize;
  const showHourly = searchParams.get("hourly") !== "false";
  const showDetails = searchParams.get("details") !== "false";
  const units = searchParams.get("units") || "metric";

  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ["widget-weather", lat, lon],
    queryFn: () => weatherApi.getWeatherData(lat, lon, locationName),
    enabled: lat !== 0 && lon !== 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const current = weatherData?.mostAccurate?.currentWeather;
  const hourly = weatherData?.mostAccurate?.hourlyForecast?.slice(0, 6);

  // Convert temp if needed (data is in Fahrenheit from Open-Meteo)
  const formatTemp = (f: number) => {
    if (units === "imperial") return `${Math.round(f)}°F`;
    return `${Math.round((f - 32) * 5 / 9)}°C`;
  };

  const themeClasses: Record<WidgetTheme, string> = {
    light: "bg-white text-gray-900 border border-gray-200",
    dark: "bg-gray-900 text-white border border-gray-700",
    glass: "bg-white/20 backdrop-blur-lg text-white border border-white/30",
    minimal: "bg-transparent text-gray-900",
  };

  const sizeClasses: Record<WidgetSize, { container: string; temp: string; icon: string }> = {
    small: { container: "p-3 max-w-[200px]", temp: "text-2xl", icon: "h-8 w-8" },
    medium: { container: "p-4 max-w-[300px]", temp: "text-4xl", icon: "h-12 w-12" },
    large: { container: "p-6 max-w-[400px]", temp: "text-5xl", icon: "h-16 w-16" },
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse rounded-xl ${themeClasses[theme]} ${sizeClasses[size].container}`}>
        <div className="h-8 bg-current/10 rounded w-2/3 mb-4" />
        <div className="h-12 bg-current/10 rounded w-1/2" />
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className={`rounded-xl ${themeClasses[theme]} ${sizeClasses[size].container}`}>
        <p className="text-sm opacity-70">Unable to load weather</p>
      </div>
    );
  }

  const ConditionIcon = getConditionIcon(current.condition);

  return (
    <div className={`rounded-xl ${themeClasses[theme]} ${sizeClasses[size].container} font-sans`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm opacity-80 truncate max-w-[150px]">{locationName}</h3>
          <p className="text-xs opacity-60">{current.condition}</p>
        </div>
        <ConditionIcon className={`${sizeClasses[size].icon} opacity-80`} />
      </div>

      {/* Current Temp */}
      <div className={`${sizeClasses[size].temp} font-bold mb-3`}>
        {formatTemp(current.temperature)}
      </div>

      {/* Details */}
      {showDetails && size !== "small" && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1 opacity-70">
            <Thermometer className="h-3 w-3" />
            <span>Feels {formatTemp(current.feelsLike)}</span>
          </div>
          <div className="flex items-center gap-1 opacity-70">
            <Wind className="h-3 w-3" />
            <span>{current.windSpeed} mph</span>
          </div>
          <div className="flex items-center gap-1 opacity-70">
            <Droplets className="h-3 w-3" />
            <span>{current.humidity}%</span>
          </div>
        </div>
      )}

      {/* Hourly */}
      {showHourly && hourly && size === "large" && (
        <div className="flex gap-2 pt-3 border-t border-current/10 overflow-x-auto">
          {hourly.map((h, i) => {
            const HIcon = getConditionIcon(h.condition);
            return (
              <div key={i} className="flex flex-col items-center min-w-[40px] text-xs">
                <span className="opacity-60">{h.time}</span>
                <HIcon className="h-4 w-4 my-1 opacity-70" />
                <span className="font-medium">{formatTemp(h.temperature)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Branding */}
      <div className="mt-3 pt-2 border-t border-current/10 text-center">
        <a 
          href="https://rainz.lovable.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] opacity-50 hover:opacity-70 transition-opacity"
        >
          Powered by Rainz
        </a>
      </div>
    </div>
  );
}
