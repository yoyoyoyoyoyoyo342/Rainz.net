import { PremiumSettings } from "@/hooks/use-premium-settings";
import { HourlyForecast as HourlyData } from "@/types/weather";
import { HourlyForecastCarousel } from "@/components/weather/hourly-forecast-carousel";

interface HourlyForecastProps {
  hourlyData: HourlyData[];
  isImperial?: boolean;
  is24Hour?: boolean;
  premiumSettings?: PremiumSettings;
}

export function HourlyForecast({ hourlyData, isImperial = true, is24Hour = true, premiumSettings }: HourlyForecastProps) {
  const isCompact = premiumSettings?.compactMode;

  return (
    <section className={`${isCompact ? 'mb-2' : 'mb-4'} md:mb-8`}>
      <div className="overflow-hidden rounded-2xl glass-card">
        <HourlyForecastCarousel
          hourlyData={hourlyData}
          isImperial={isImperial}
          is24Hour={is24Hour}
          isCompact={!!isCompact}
          showHeader={true}
        />
      </div>
    </section>
  );
}

