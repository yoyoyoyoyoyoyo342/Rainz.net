import { MapPin, RefreshCw, Eye, Droplets, Wind, Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog, Camera, Plus, Minus, Snowflake, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeatherSource } from "@/types/weather";
import { useState } from "react";
import { LocationCard } from "./location-card";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PremiumSettings } from "@/hooks/use-premium-settings";

interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  state: string | null;
  is_primary: boolean;
}

interface CurrentWeatherProps {
  weatherData: WeatherSource[];
  mostAccurate: WeatherSource;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  isImperial?: boolean;
  isAutoDetected?: boolean;
  currentLocation?: { lat: number; lon: number; name: string };
  onLocationSelect?: (lat: number, lon: number, locationName: string) => void;
  displayName?: string | null;
  actualStationName?: string;
  premiumSettings?: PremiumSettings;
}

export function CurrentWeather({
  weatherData,
  mostAccurate,
  onRefresh,
  isLoading,
  lastUpdated,
  isImperial = true,
  isAutoDetected = false,
  currentLocation,
  onLocationSelect,
  displayName,
  actualStationName,
  premiumSettings
}: CurrentWeatherProps) {
  const [showLocationCard, setShowLocationCard] = useState(false);
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: savedLocations = [] } = useQuery({
    queryKey: ["saved-locations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("saved_locations").select("*").order("is_primary", { ascending: false }).order("name");
      if (error) throw error;
      return data as SavedLocation[];
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!currentLocation) throw new Error("No current location");
      const { error } = await supabase.from("saved_locations").insert({
        user_id: user.id,
        name: currentLocation.name,
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        is_primary: savedLocations.length === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location saved");
    },
    onError: () => toast.error("Failed to save location"),
  });

  const removeLocationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!currentLocation) throw new Error("No current location");
      const savedLocation = savedLocations.find(
        loc => Math.abs(loc.latitude - currentLocation.lat) < 0.01 && Math.abs(loc.longitude - currentLocation.lon) < 0.01
      );
      if (!savedLocation) throw new Error("Location not found");
      const { error } = await supabase.from("saved_locations").delete().eq("id", savedLocation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location removed");
    },
    onError: () => toast.error("Failed to remove location"),
  });

  const savedLocationData = currentLocation && savedLocations.find(
    loc => Math.abs(loc.latitude - currentLocation.lat) < 0.01 && Math.abs(loc.longitude - currentLocation.lon) < 0.01
  );
  const isLocationSaved = !!savedLocationData;

  // Check if condition needs dark text for contrast (light backgrounds like snow)
  const needsDarkText = (condition: string) => {
    const c = condition.toLowerCase();
    return c.includes("snow") || c.includes("sleet");
  };

  const isSnowCondition = needsDarkText(mostAccurate.currentWeather.condition);
  const textColor = isSnowCondition ? "text-slate-800" : "text-white";
  const textMuted = isSnowCondition ? "text-slate-600" : "text-white/80";
  const textFaded = isSnowCondition ? "text-slate-500" : "text-white/60";
  const textSubtle = isSnowCondition ? "text-slate-400" : "text-white/70";
  const bgOverlay = isSnowCondition ? "bg-slate-800/15" : "bg-white/15";
  const bgOverlayHover = isSnowCondition ? "bg-slate-800/20" : "bg-white/20";
  const bgOverlayLight = isSnowCondition ? "bg-slate-800/10" : "bg-white/10";
  const bgOverlayLighter = isSnowCondition ? "bg-slate-800/5" : "bg-white/5";

  const getConditionIcon = (condition: string, size: string = "w-8 h-8") => {
    const c = condition.toLowerCase();
    const iconClass = `${size} ${textColor} drop-shadow-lg`;
    if (c.includes("thunder")) return <CloudLightning className={iconClass} />;
    if (c.includes("snow")) return <Snowflake className={iconClass} />;
    if (c.includes("drizzle")) return <CloudDrizzle className={iconClass} />;
    if (c.includes("shower") || c.includes("rain")) return <CloudRain className={iconClass} />;
    if (c.includes("fog")) return <CloudFog className={iconClass} />;
    if (c.includes("overcast")) return <Cloud className={iconClass} />;
    if (c.includes("partly") || c.includes("sun")) return <CloudSun className={iconClass} />;
    if (c.includes("cloud")) return <Cloud className={iconClass} />;
    return <Sun className={iconClass} />;
  };

  const getWeatherGradient = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes("thunder") || c.includes("storm")) return "from-slate-700/80 via-purple-800/70 to-slate-800/80";
    if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return "from-slate-500/80 via-blue-600/70 to-slate-600/80";
    if (c.includes("snow") || c.includes("sleet")) return "from-slate-200/80 via-blue-100/70 to-white/80";
    if (c.includes("fog") || c.includes("mist")) return "from-gray-300/80 via-gray-400/70 to-gray-500/80";
    if (c.includes("overcast")) return "from-gray-500/80 via-slate-600/70 to-gray-700/80";
    if (c.includes("cloud") && !c.includes("partly")) return "from-gray-400/80 via-slate-500/70 to-gray-600/80";
    if (c.includes("partly")) return "from-blue-300/80 via-gray-300/70 to-blue-400/80";
    return "from-sky-300/80 via-blue-400/70 to-indigo-500/80";
  };

  const formatWindSpeed = (speed: number) => {
    return isImperial ? `${speed}` : `${Math.round(speed * 1.609)}`;
  };

  const feelsLikeTemp = isImperial ? mostAccurate.currentWeather.feelsLike : Math.round((mostAccurate.currentWeather.feelsLike - 32) * 5 / 9);
  const actualTemp = isImperial ? mostAccurate.currentWeather.temperature : Math.round((mostAccurate.currentWeather.temperature - 32) * 5 / 9);
  const highTemp = isImperial ? mostAccurate.dailyForecast[0]?.highTemp : Math.round((mostAccurate.dailyForecast[0]?.highTemp - 32) * 5 / 9);
  const lowTemp = isImperial ? mostAccurate.dailyForecast[0]?.lowTemp : Math.round((mostAccurate.dailyForecast[0]?.lowTemp - 32) * 5 / 9);
  const displayVisibility = isImperial ? mostAccurate.currentWeather.visibility : Math.round(mostAccurate.currentWeather.visibility * 1.60934 * 10) / 10;

  const locationDisplay = displayName ? displayName.split(',')[0] : (isAutoDetected ? t('weather.myLocation') : mostAccurate.location.split(',')[0]);

  const isCompact = premiumSettings?.compactMode;
  const cardPadding = isCompact ? 'p-2' : 'p-4';
  const statsPadding = isCompact ? 'p-1.5' : 'p-2.5';
  const tempSize = isCompact ? 'text-4xl' : 'text-6xl';
  const feelsLikeTempSize = isCompact ? 'text-xl' : 'text-3xl';
  const iconSize = isCompact ? 'w-10 h-10' : 'w-16 h-16';
  const marginBottom = isCompact ? 'mb-2' : 'mb-4';

  return (
    <section className="mb-4">
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className={`relative bg-gradient-to-br ${getWeatherGradient(mostAccurate.currentWeather.condition)} ${cardPadding}`}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute -top-20 -right-20 w-40 h-40 ${bgOverlayLight} rounded-full blur-3xl`} />
            <div className={`absolute -bottom-10 -left-10 w-32 h-32 ${bgOverlayLighter} rounded-full blur-2xl`} />
          </div>

          <div className={`relative flex items-center justify-between ${marginBottom}`}>
            <div className="flex items-center gap-2">
              <MapPin className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted}`} />
              <span className={`${textColor} font-semibold ${isCompact ? 'text-base' : 'text-lg'}`}>{locationDisplay}</span>
              {currentLocation && !isCompact && (
                <button
                  onClick={() => isLocationSaved ? removeLocationMutation.mutate() : addLocationMutation.mutate()}
                  className={`w-6 h-6 rounded-full ${bgOverlayHover} flex items-center justify-center hover:opacity-80 transition-colors`}
                >
                  {isLocationSaved ? <Minus className={`w-3 h-3 ${textColor}`} /> : <Plus className={`w-3 h-3 ${textColor}`} />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className={`${isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full ${bgOverlayHover} flex items-center justify-center hover:opacity-80 transition-colors disabled:opacity-50`}
              >
                <RefreshCw className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textColor} ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className={`relative flex items-center justify-between ${marginBottom}`}>
            <div className={`flex items-center ${isCompact ? 'gap-2' : 'gap-3'}`}>
              <div className={`${iconSize} rounded-2xl ${bgOverlayHover} backdrop-blur-sm flex items-center justify-center`}>
                {getConditionIcon(mostAccurate.currentWeather.condition)}
              </div>
              <div>
                <div className="flex items-baseline">
                  <span className={`${tempSize} font-bold ${textColor} tracking-tight`}>{actualTemp}</span>
                  <span className={`${isCompact ? 'text-lg' : 'text-2xl'} ${textSubtle} ml-1`}>°{isImperial ? 'F' : 'C'}</span>
                </div>
                <p className={`${textMuted} font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>{mostAccurate.currentWeather.condition}</p>
              </div>
            </div>

            {(premiumSettings?.showFeelsLike !== false) && (
              <div className="text-right">
                <p className={`${textFaded} uppercase tracking-wide ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{t('weather.feelsLike')}</p>
                <p className={`${feelsLikeTempSize} font-bold ${textColor}`}>{feelsLikeTemp}°</p>
                <p className={`${textSubtle} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>H:{highTemp}° L:{lowTemp}°</p>
              </div>
            )}
          </div>

          <div className={`relative grid grid-cols-3 ${isCompact ? 'gap-1' : 'gap-2'}`}>
            <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
              <Wind className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted} mx-auto ${isCompact ? 'mb-0.5' : 'mb-1'}`} />
              <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{formatWindSpeed(mostAccurate.currentWeather.windSpeed)}</p>
              <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{isImperial ? 'mph' : 'km/h'}</p>
            </div>
            {(premiumSettings?.showHumidity !== false) && (
              <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
                <Droplets className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted} mx-auto ${isCompact ? 'mb-0.5' : 'mb-1'}`} />
                <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{mostAccurate.currentWeather.humidity}%</p>
                <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>Humidity</p>
              </div>
            )}
            {(premiumSettings?.showVisibility !== false) && (
              <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
                <Eye className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted} mx-auto ${isCompact ? 'mb-0.5' : 'mb-1'}`} />
                <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{displayVisibility}</p>
                <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{isImperial ? 'mi' : 'km'}</p>
              </div>
            )}
            {premiumSettings?.showPrecipChance && (mostAccurate.currentWeather as any).precipChance !== undefined && (
              <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
                <Droplets className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${isSnowCondition ? 'text-blue-600' : 'text-blue-300'} mx-auto ${isCompact ? 'mb-0.5' : 'mb-1'}`} />
                <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{(mostAccurate.currentWeather as any).precipChance}%</p>
                <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>Precip</p>
              </div>
            )}
            {premiumSettings?.showDewPoint && mostAccurate.currentWeather.dewPoint !== undefined && (
              <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
                <Thermometer className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted} mx-auto ${isCompact ? 'mb-0.5' : 'mb-1'}`} />
                <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {isImperial ? mostAccurate.currentWeather.dewPoint : Math.round((mostAccurate.currentWeather.dewPoint - 32) * 5 / 9)}°
                </p>
                <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>Dew Pt</p>
              </div>
            )}
            {premiumSettings?.showPressure && mostAccurate.currentWeather.pressure !== undefined && (
              <div className={`${bgOverlay} backdrop-blur-sm rounded-xl ${statsPadding} text-center`}>
                <span className={`${textMuted} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>hPa</span>
                <p className={`${textColor} font-semibold ${isCompact ? 'text-xs' : 'text-sm'}`}>{Math.round(mostAccurate.currentWeather.pressure)}</p>
                <p className={`${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>Pressure</p>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-2 bg-background/60 backdrop-blur-md border-t border-border/30">
          <div className="flex gap-2">
            <Button onClick={() => setShowLocationCard(true)} variant="ghost" size="sm" className="flex-1 h-8 text-xs">
              <Camera className="w-3 h-3 mr-1.5" />
              Share Card
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <LocationCard 
        open={showLocationCard} 
        onOpenChange={setShowLocationCard}
        temperature={mostAccurate.currentWeather.temperature}
        location={displayName || mostAccurate.location}
        actualStationName={actualStationName || mostAccurate.location}
        isImperial={isImperial}
      />
    </section>
  );
}
