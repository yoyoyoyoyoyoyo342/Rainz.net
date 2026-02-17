import { MapPin, RefreshCw, Eye, Droplets, Wind, Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog, Share2, Plus, Minus, Snowflake, Thermometer, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeatherSource } from "@/types/weather";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PremiumSettings } from "@/hooks/use-premium-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import rainzLogo from "@/assets/rainz-logo-new.png";
import { HourlyForecastCarousel } from "@/components/weather/hourly-forecast-carousel";
import { CommunityAccuracyBadge } from "@/components/weather/community-accuracy-badge";

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
  hourlyData?: any[];
  is24Hour?: boolean;
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
  premiumSettings,
  hourlyData,
  is24Hour = true,
}: CurrentWeatherProps) {
  const [showShareCard, setShowShareCard] = useState(false);
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<string | null>(null);
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Reset location image when location changes
  useEffect(() => {
    const currentLocationKey = currentLocation ? `${currentLocation.lat}-${currentLocation.lon}` : null;
    if (prevLocationRef.current !== currentLocationKey) {
      prevLocationRef.current = currentLocationKey;
      setLocationImage(null);
    }
  }, [currentLocation]);
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

          {hourlyData && hourlyData.length > 0 && (
            <div className="relative mt-3">
              <div className={`flex items-center gap-1.5 mb-2 ${textFaded} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                <Clock className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${textMuted}`} />
                <span>24-Hour Forecast</span>
              </div>
              <div className="overflow-x-hidden">
                <HourlyForecastCarousel
                  hourlyData={hourlyData as any}
                  isImperial={isImperial}
                  is24Hour={is24Hour}
                  isCompact={!!premiumSettings?.compactMode}
                  showHeader={false}
                  colorScheme={isSnowCondition ? "default" : "inverse"}
                />
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-2 bg-background/60 backdrop-blur-md border-t border-border/30">
          <div className="flex flex-col gap-2">
            {currentLocation && (
              <CommunityAccuracyBadge
                locationName={currentLocation.name}
                latitude={currentLocation.lat}
                longitude={currentLocation.lon}
              />
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowShareCard(true)} variant="ghost" size="sm" className="flex-1 h-8 text-xs">
                <Share2 className="w-3 h-3 mr-1.5" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Social Weather Card Dialog with Photo Background - uses actual station name, not custom display name */}
      <SocialShareCardDialog
        open={showShareCard}
        onOpenChange={setShowShareCard}
        location={actualStationName || mostAccurate.location}
        temperature={mostAccurate.currentWeather.temperature}
        feelsLike={mostAccurate.currentWeather.feelsLike}
        condition={mostAccurate.currentWeather.condition}
        humidity={mostAccurate.currentWeather.humidity}
        windSpeed={mostAccurate.currentWeather.windSpeed}
        isImperial={isImperial}
        highTemp={mostAccurate.dailyForecast[0]?.highTemp}
        lowTemp={mostAccurate.dailyForecast[0]?.lowTemp}
        cardRef={cardRef}
        locationImage={locationImage}
        setLocationImage={setLocationImage}
        imageLoading={imageLoading}
        setImageLoading={setImageLoading}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
      />
    </section>
  );
}

// Inline Social Share Card Dialog Component
interface SocialShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  isImperial: boolean;
  highTemp?: number;
  lowTemp?: number;
  cardRef: React.RefObject<HTMLDivElement>;
  locationImage: string | null;
  setLocationImage: (url: string | null) => void;
  imageLoading: boolean;
  setImageLoading: (loading: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

function SocialShareCardDialog({
  open,
  onOpenChange,
  location,
  temperature,
  feelsLike,
  condition,
  humidity,
  windSpeed,
  isImperial,
  highTemp,
  lowTemp,
  cardRef,
  locationImage,
  setLocationImage,
  imageLoading,
  setImageLoading,
  isGenerating,
  setIsGenerating,
}: SocialShareCardDialogProps) {
  const getConditionIcon = (cond: string) => {
    const c = cond.toLowerCase();
    if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
    if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return CloudSnow;
    if (c.includes("cloud") || c.includes("overcast") || c.includes("fog")) return Cloud;
    return Sun;
  };

  const ConditionIcon = getConditionIcon(condition);
  const formatTemp = (t: number) => `${Math.round(isImperial ? t : (t - 32) * 5 / 9)}°${isImperial ? "F" : "C"}`;

  // Fetch location image when dialog opens
  useEffect(() => {
    if (!open || !location || locationImage) return;

    let cancelled = false;
    const load = async () => {
      setImageLoading(true);
      try {
        // Use our server-side Unsplash integration (avoids CORS/redirect issues from source.unsplash.com)
        // Match LocationCard behavior: try a clean city name for more reliable results.
        const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
        const searchLocation = parts.length > 1 ? parts[0] : parts[0] || location;

        const { data, error } = await supabase.functions.invoke("generate-landmark-image", {
          body: { location: searchLocation },
        });

        const imageUrl: string | null = !error ? (data?.image ?? null) : null;
        if (!imageUrl) {
          if (!cancelled) setLocationImage(null);
          return;
        }

        // Preload before setting to avoid a blank frame
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image preload failed"));
          img.src = imageUrl;
        });

        if (!cancelled) setLocationImage(imageUrl);
      } catch (e) {
        console.error("Error fetching social card photo:", e);
        if (!cancelled) setLocationImage(null);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, location, locationImage, condition, setLocationImage, setImageLoading]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      // Wait a bit for any rendering to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        // Include background and ensure images are captured
        includeQueryParams: true,
        fetchRequestInit: {
          mode: 'cors',
          credentials: 'omit',
        },
      });

      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `rainz-weather-${location.replace(/\s+/g, "-")}.png`, { type: "image/png" });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Weather in ${location}`,
              text: `Current weather: ${Math.round(temperature)}° ${condition}`,
            });
            setIsGenerating(false);
            return;
          }
        } catch (e) {
          console.log("Share failed, falling back to download:", e);
        }
      }

      const link = document.createElement("a");
      link.download = `rainz-weather-${location.replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Downloaded!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Weather Card</DialogTitle>
        </DialogHeader>

        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl aspect-[4/5]"
          style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}
        >
          {imageLoading ? (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          ) : locationImage ? (
            <img 
              src={locationImage} 
              alt={location}
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={() => setLocationImage(null)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

          <div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
            <div>
              <p className="text-sm opacity-90 mb-1 drop-shadow-md">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <h2 className="text-xl font-bold truncate drop-shadow-lg">{location}</h2>
            </div>

            <div className="flex items-center justify-between py-6">
              <div>
                <div className="text-7xl font-bold tracking-tight drop-shadow-lg">{formatTemp(temperature)}</div>
                <p className="text-lg opacity-95 mt-1 drop-shadow-md">{condition}</p>
              </div>
              <ConditionIcon className="h-24 w-24 opacity-95 drop-shadow-lg" />
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-t border-white/30 backdrop-blur-sm bg-black/20 -mx-6 px-6">
              <div className="text-center">
                <Thermometer className="h-5 w-5 mx-auto mb-1 opacity-80" />
                <p className="text-xs opacity-80">Feels like</p>
                <p className="font-semibold drop-shadow-sm">{formatTemp(feelsLike)}</p>
              </div>
              <div className="text-center">
                <Wind className="h-5 w-5 mx-auto mb-1 opacity-80" />
                <p className="text-xs opacity-80">Wind</p>
                <p className="font-semibold drop-shadow-sm">{windSpeed} {isImperial ? "mph" : "km/h"}</p>
              </div>
              <div className="text-center">
                <Droplets className="h-5 w-5 mx-auto mb-1 opacity-80" />
                <p className="text-xs opacity-80">Humidity</p>
                <p className="font-semibold drop-shadow-sm">{humidity}%</p>
              </div>
            </div>

            {highTemp !== undefined && lowTemp !== undefined && (
              <div className="flex justify-center gap-6 py-2">
                <span className="opacity-90 drop-shadow-sm">H: {formatTemp(highTemp)}</span>
                <span className="opacity-90 drop-shadow-sm">L: {formatTemp(lowTemp)}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/20">
              <img src={rainzLogo} alt="Rainz" className="h-6 w-6 rounded" />
              <span className="text-sm font-medium opacity-90 drop-shadow-sm">Rainz.net</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button className="flex-1" onClick={handleDownload} disabled={isGenerating || imageLoading}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {navigator.share ? "Share" : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
