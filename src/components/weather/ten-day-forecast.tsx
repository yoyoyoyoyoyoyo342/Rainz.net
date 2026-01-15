import { useState } from "react";
import { CalendarDays, Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, Snowflake, CloudLightning, CloudFog, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DailyForecast, WeatherSource, HourlyForecast } from "@/types/weather";
import { formatTime } from "@/lib/time-format";
import { PremiumSettings } from "@/hooks/use-premium-settings";

interface TenDayForecastProps {
  dailyForecast: DailyForecast[];
  weatherSources: WeatherSource[];
  hourlyForecast: HourlyForecast[];
  isImperial?: boolean;
  is24Hour?: boolean;
  premiumSettings?: PremiumSettings;
}

export function TenDayForecast({ dailyForecast, weatherSources, hourlyForecast, isImperial = true, is24Hour = true, premiumSettings }: TenDayForecastProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const isCompact = premiumSettings?.compactMode;

  const getConditionIcon = (condition: string, size: string = "w-6 h-6") => {
    const c = condition.toLowerCase();
    const iconClass = `${size} text-primary drop-shadow`;
    if (c.includes("thunder")) return <CloudLightning className={iconClass} />;
    if (c.includes("drizzle")) return <CloudDrizzle className={iconClass} />;
    if (c.includes("shower") || c.includes("rain")) return <CloudRain className={iconClass} />;
    if (c.includes("snow")) return <Snowflake className={iconClass} />;
    if (c.includes("fog")) return <CloudFog className={iconClass} />;
    if (c.includes("partly") || c.includes("sun")) return <CloudSun className={iconClass} />;
    if (c.includes("cloud")) return <Cloud className={iconClass} />;
    return <Sun className={iconClass} />;
  };

  const getHourlyForDay = (dayIndex: number) => {
    if (!hourlyForecast.length) return [];
    
    const actualDayIndex = dayIndex + 1;
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + actualDayIndex);
    targetDate.setHours(0, 0, 0, 0);
    
    const dayHours: HourlyForecast[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const checkDate = new Date(targetDate);
      checkDate.setHours(hour);
      
      const hoursFromNow = Math.round((checkDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (hoursFromNow >= 0 && hoursFromNow < hourlyForecast.length) {
        const hourData = hourlyForecast[hoursFromNow];
        dayHours.push({
          ...hourData,
          time: `${String(hour).padStart(2, '0')}:00`
        });
      }
    }
    
    return dayHours;
  };

  const toggleDay = (index: number) => {
    setExpandedDay(expandedDay === index ? null : index);
  };

  const cardPadding = isCompact ? 'p-3' : 'p-4';
  const itemPadding = isCompact ? 'p-2' : 'p-3';
  const iconSize = isCompact ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = isCompact ? 'text-xs' : 'text-sm';
  const tempSize = isCompact ? 'text-base' : 'text-lg';

  return (
    <section className={`${isCompact ? 'mb-2' : 'mb-4'} md:mb-8`}>
      <div className="overflow-hidden rounded-2xl glass-card">
        {/* Header without gradient */}
        <div className={`${cardPadding} border-b border-border/50`}>
          <h2 className={`${isCompact ? 'text-sm' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
            <CalendarDays className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-primary`} />
            10-Day Forecast
          </h2>
        </div>

        {/* Content */}
        <div className={cardPadding}>
          <div className={`${isCompact ? 'space-y-1' : 'space-y-2'}`}>
            {dailyForecast.slice(1, showAllDays ? 11 : 4).map((day, index) => (
              <Collapsible
                key={index}
                open={expandedDay === index}
                onOpenChange={() => toggleDay(index)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className={`flex items-center justify-between ${itemPadding} rounded-xl bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-all`}>
                    <div className="flex items-center gap-3">
                      <span className={`${textSize} font-medium text-muted-foreground w-12`}>{day.day}</span>
                      <div className={`${iconSize} rounded-full bg-primary/10 flex items-center justify-center`}>
                        {getConditionIcon(day.condition, isCompact ? 'w-4 h-4' : 'w-5 h-5')}
                      </div>
                      <span className={`${textSize} font-medium text-foreground truncate max-w-[100px]`}>{day.condition}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{day.precipitation}%</span>
                      <div className="text-right">
                        <span className={`${tempSize} font-bold text-foreground`}>
                          {isImperial ? day.highTemp : Math.round((day.highTemp - 32) * 5/9)}°
                        </span>
                        <span className={`${textSize} text-muted-foreground ml-1`}>
                          {isImperial ? day.lowTemp : Math.round((day.lowTemp - 32) * 5/9)}°
                        </span>
                      </div>
                      {expandedDay === index ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2">
                  <div className={`rounded-xl ${isCompact ? 'p-2' : 'p-3'} bg-muted/20 border border-border/30`}>
                    <div className={`flex items-center gap-2 ${isCompact ? 'mb-2' : 'mb-3'}`}>
                      <Clock className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-primary`} />
                      <span className={`${textSize} font-medium`}>Hourly Breakdown</span>
                    </div>
                    <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 ${isCompact ? 'gap-1' : 'gap-2'}`}>
                      {getHourlyForDay(index).map((hour, hourIndex) => (
                        <div
                          key={hourIndex}
                          className={`text-center ${isCompact ? 'p-1' : 'p-2'} rounded-lg bg-background/60 border border-border/30`}
                        >
                          <div className={`${isCompact ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-1`}>
                            {formatTime(hour.time, is24Hour)}
                          </div>
                          <div className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'} mx-auto mb-1 rounded-full bg-primary/10 flex items-center justify-center`}>
                            {getConditionIcon(hour.condition, isCompact ? 'w-3 h-3' : 'w-4 h-4')}
                          </div>
                          <div className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium`}>
                            {isImperial ? Math.round(hour.temperature) : Math.round((hour.temperature - 32) * 5/9)}°
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {dailyForecast.length > 4 && (
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className={`w-full ${isCompact ? 'mt-2 py-1' : 'mt-3 py-2'} px-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 ${textSize} font-medium text-foreground transition-all flex items-center justify-center gap-2`}
            >
              {showAllDays ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All 10 Days
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
