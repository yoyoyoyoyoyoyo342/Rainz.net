import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { CurrentWeather, HourlyForecast } from "@/types/weather";
import { formatTime } from "@/lib/time-format";
import { PremiumSettings } from "@/hooks/use-premium-settings";
import { useLanguage } from "@/contexts/language-context";
import { UVIndexGraph } from "./uv-index-graph";

interface DetailedMetricsProps {
  currentWeather: CurrentWeather;
  hourlyForecast?: HourlyForecast[];
  is24Hour?: boolean;
  premiumSettings?: PremiumSettings;
}

export function DetailedMetrics({
  currentWeather,
  hourlyForecast = [],
  is24Hour = true,
  premiumSettings
}: DetailedMetricsProps) {
  const { t } = useLanguage();
  const showUV = premiumSettings?.showUV !== false;
  const showSunTimes = premiumSettings?.showSunTimes !== false;
  const showMoonPhase = premiumSettings?.showMoonPhase !== false;

  if (!showUV && !showSunTimes && !showMoonPhase) {
    return null;
  }

  return (
    <section className="mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UV Index Card */}
        {showUV && (
          <div className="overflow-hidden rounded-2xl glass-card">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{t('card.uvIndex')}</h3>
              </div>
            </div>
            <div className="p-4">
              <UVIndexGraph
                currentUV={currentWeather.uvIndex}
                hourlyForecast={hourlyForecast}
                is24Hour={is24Hour}
              />
            </div>
          </div>
        )}

        {/* Sun & Moon Card */}
        {(showSunTimes || showMoonPhase) && (
          <div className="overflow-hidden rounded-2xl glass-card">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sunrise className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{t('card.sunMoon')}</h3>
              </div>
            </div>
            <div className="p-4">
              <div className={`grid ${showSunTimes && showMoonPhase ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {/* Sun */}
                {showSunTimes && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">{t('card.sunrise')}</span>
                      </div>
                      <span className="font-semibold text-sm">{formatTime(currentWeather.sunrise, is24Hour)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Sunset className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-muted-foreground">{t('card.sunset')}</span>
                      </div>
                      <span className="font-semibold text-sm">{formatTime(currentWeather.sunset, is24Hour)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">{t('card.daylight')}</span>
                      <span className="font-medium">{currentWeather.daylight ?? '—'}</span>
                    </div>
                  </div>
                )}

                {/* Moon */}
                {showMoonPhase && (
                  <div className={`space-y-3 ${showSunTimes ? 'border-l border-border/50 pl-4' : ''}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-muted-foreground">Rise</span>
                      </div>
                      <span className="font-semibold text-sm">{formatTime(currentWeather.moonrise, is24Hour)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-slate-500" />
                        <span className="text-xs text-muted-foreground">Set</span>
                      </div>
                      <span className="font-semibold text-sm">{formatTime(currentWeather.moonset, is24Hour)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Phase</span>
                      <span className="font-medium">{currentWeather.moonPhase ?? '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
