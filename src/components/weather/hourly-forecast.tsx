import { useState } from "react";
import { Clock, Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, Snowflake, CloudLightning, CloudFog, Droplets, Wind, Eye, Thermometer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HourlyForecast as HourlyData } from "@/types/weather";
import { formatTime } from "@/lib/time-format";
import { PremiumSettings } from "@/hooks/use-premium-settings";

interface HourlyForecastProps {
  hourlyData: HourlyData[];
  isImperial?: boolean;
  is24Hour?: boolean;
  premiumSettings?: PremiumSettings;
}

interface HourDetailDialogProps {
  hour: HourlyData | null;
  isOpen: boolean;
  onClose: () => void;
  isImperial: boolean;
  is24Hour: boolean;
}

function HourDetailDialog({ hour, isOpen, onClose, isImperial, is24Hour }: HourDetailDialogProps) {
  if (!hour) return null;

  const temp = isImperial ? hour.temperature : Math.round((hour.temperature - 32) * 5/9);
  const feelsLike = hour.feelsLike !== undefined 
    ? (isImperial ? hour.feelsLike : Math.round((hour.feelsLike - 32) * 5/9)) 
    : temp;
  const windSpeed = hour.windSpeed !== undefined 
    ? (isImperial ? hour.windSpeed : Math.round(hour.windSpeed * 1.609)) 
    : 0;
  const humidity = hour.humidity ?? 0;

  const getConditionIcon = (condition: string, size: string = "w-12 h-12") => {
    const c = condition.toLowerCase();
    const iconClass = `${size} text-primary`;
    if (c.includes("thunder")) return <CloudLightning className={iconClass} />;
    if (c.includes("drizzle")) return <CloudDrizzle className={iconClass} />;
    if (c.includes("shower") || c.includes("rain")) return <CloudRain className={iconClass} />;
    if (c.includes("snow")) return <Snowflake className={iconClass} />;
    if (c.includes("fog")) return <CloudFog className={iconClass} />;
    if (c.includes("overcast")) return <Cloud className={iconClass} />;
    if (c.includes("partly") || c.includes("sun")) return <CloudSun className={iconClass} />;
    if (c.includes("cloud")) return <Cloud className={iconClass} />;
    return <Sun className={iconClass} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            {formatTime(hour.time, is24Hour)} Forecast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Main weather info */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-4">
              {getConditionIcon(hour.condition)}
              <div>
                <p className="text-3xl font-bold">{temp}°{isImperial ? 'F' : 'C'}</p>
                <p className="text-sm text-muted-foreground">{hour.condition}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Feels Like</p>
                <p className="font-semibold">{feelsLike}°{isImperial ? 'F' : 'C'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Precipitation</p>
                <p className="font-semibold">{hour.precipitation}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Wind className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wind</p>
                <p className="font-semibold">{windSpeed} {isImperial ? 'mph' : 'km/h'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="font-semibold">{humidity}%</p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium mb-1">💡 What to Expect</p>
            <p className="text-xs text-muted-foreground">
              {hour.precipitation > 50
                ? `High chance of precipitation (${hour.precipitation}%). Consider bringing an umbrella.`
                : hour.precipitation > 20
                ? `Slight chance of precipitation (${hour.precipitation}%). Keep an eye on the sky.`
                : temp > 85
                ? "Hot conditions. Stay hydrated and seek shade when possible."
                : temp < 32
                ? "Freezing temperatures. Bundle up and watch for ice."
                : "Good conditions for outdoor activities."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HourlyForecast({ hourlyData, isImperial = true, is24Hour = true, premiumSettings }: HourlyForecastProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyData | null>(null);
  const isCompact = premiumSettings?.compactMode;
  
  const getConditionIcon = (condition: string, size: string = "w-5 h-5") => {
    const c = condition.toLowerCase();
    const iconClass = `${size} text-primary drop-shadow`;
    if (c.includes("thunder")) return <CloudLightning className={iconClass} />;
    if (c.includes("drizzle")) return <CloudDrizzle className={iconClass} />;
    if (c.includes("shower") || c.includes("rain")) return <CloudRain className={iconClass} />;
    if (c.includes("snow")) return <Snowflake className={iconClass} />;
    if (c.includes("fog")) return <CloudFog className={iconClass} />;
    if (c.includes("overcast")) return <Cloud className={iconClass} />;
    if (c.includes("partly") || c.includes("sun")) return <CloudSun className={iconClass} />;
    if (c.includes("cloud")) return <Cloud className={iconClass} />;
    return <Sun className={iconClass} />;
  };

  // Create array of 24 hours starting from current hour
  const now = new Date();
  const fullDayData: HourlyData[] = [];
  
  for (let i = 0; i < 24; i++) {
    const futureDate = new Date(now);
    futureDate.setHours(now.getHours() + i, 0, 0, 0);
    
    const hour = futureDate.getHours();
    
    if (i < hourlyData.length) {
      fullDayData.push({
        ...hourlyData[i],
        time: `${String(hour).padStart(2, '0')}:00`
      });
    }
  }
  
  const cardPadding = isCompact ? 'p-3' : 'p-4';
  const iconSize = isCompact ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = isCompact ? 'text-xs' : 'text-sm';
  const tempSize = isCompact ? 'text-base' : 'text-lg';
  
  return (
    <section className={`${isCompact ? 'mb-2' : 'mb-4'} md:mb-8`}>
      <div className="overflow-hidden rounded-2xl glass-card">
        {/* Header - matching main card style without gradient */}
        <div className={`${cardPadding} border-b border-border/50`}>
          <h2 className={`${isCompact ? 'text-sm' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
            <Clock className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-primary`} />
            24-Hour Forecast
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Tap any hour for details</p>
        </div>

        {/* Horizontal scrolling carousel */}
        <div className={`${cardPadding} overflow-x-auto scrollbar-hide`}>
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {fullDayData.map((hour, index) => (
              <button
                key={index}
                onClick={() => setSelectedHour(hour)}
                className={`flex flex-col items-center ${isCompact ? 'p-2 min-w-[60px]' : 'p-3 min-w-[72px]'} rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all cursor-pointer group`}
              >
                <span className={`${textSize} font-medium text-muted-foreground mb-2`}>
                  {formatTime(hour.time, is24Hour)}
                </span>
                <div className={`${iconSize} rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors`}>
                  {getConditionIcon(hour.condition, isCompact ? 'w-4 h-4' : 'w-5 h-5')}
                </div>
                <span className={`${tempSize} font-bold text-foreground`}>
                  {isImperial ? hour.temperature : Math.round((hour.temperature - 32) * 5/9)}°
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                  <Droplets className="w-2.5 h-2.5" />
                  {hour.precipitation}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hour detail dialog */}
      <HourDetailDialog
        hour={selectedHour}
        isOpen={!!selectedHour}
        onClose={() => setSelectedHour(null)}
        isImperial={isImperial}
        is24Hour={is24Hour}
      />
    </section>
  );
}
