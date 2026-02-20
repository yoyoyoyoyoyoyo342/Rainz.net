import { useMemo } from "react";
import { BarChart3, Droplets, Thermometer, Wind, Sun, Eye } from "lucide-react";

interface WeatherFunFactsProps {
  currentWeather: any;
  dailyForecast?: any[];
  hourlyForecast?: any[];
  locationName: string;
  isImperial: boolean;
}

interface FunFact {
  icon: React.ReactNode;
  text: string;
  color: string;
}

export function WeatherFunFacts({ currentWeather, dailyForecast, hourlyForecast, locationName, isImperial }: WeatherFunFactsProps) {
  const facts = useMemo(() => {
    if (!currentWeather) return [];

    const result: FunFact[] = [];
    const temp = isImperial ? currentWeather.temperature : Math.round((currentWeather.temperature - 32) * 5 / 9);
    const unit = isImperial ? "°F" : "°C";
    const windUnit = isImperial ? "mph" : "km/h";
    const wind = isImperial ? currentWeather.windSpeed : Math.round(currentWeather.windSpeed * 1.609);

    // Fact: Warmest/coldest day this week
    if (dailyForecast && dailyForecast.length >= 3) {
      const highs = dailyForecast.slice(0, 7).map((d: any) => {
        const h = isImperial ? d.highTemp : Math.round((d.highTemp - 32) * 5 / 9);
        return { day: d.day, high: h };
      });
      const maxDay = highs.reduce((a, b) => a.high > b.high ? a : b);
      const minDay = highs.reduce((a, b) => a.high < b.high ? a : b);

      if (maxDay.day === highs[0].day) {
        result.push({
          icon: <Thermometer className="w-4 h-4" />,
          text: `Today is the warmest day this week at ${maxDay.high}${unit}`,
          color: "text-orange-400",
        });
      } else if (minDay.day === highs[0].day) {
        result.push({
          icon: <Thermometer className="w-4 h-4" />,
          text: `Today is the coolest day this week at ${minDay.high}${unit}`,
          color: "text-blue-400",
        });
      } else {
        result.push({
          icon: <Thermometer className="w-4 h-4" />,
          text: `${maxDay.day} will be the warmest day this week (${maxDay.high}${unit})`,
          color: "text-orange-400",
        });
      }

      // Rain days count
      const rainyDays = dailyForecast.slice(0, 7).filter((d: any) => {
        const cond = (d.condition || "").toLowerCase();
        return cond.includes("rain") || cond.includes("shower") || cond.includes("drizzle");
      }).length;

      if (rainyDays >= 5) {
        result.push({
          icon: <Droplets className="w-4 h-4" />,
          text: `Rain is expected ${rainyDays} out of the next 7 days in ${locationName}`,
          color: "text-blue-400",
        });
      } else if (rainyDays === 0) {
        result.push({
          icon: <Sun className="w-4 h-4" />,
          text: `No rain expected in the next 7 days — enjoy the dry spell!`,
          color: "text-yellow-400",
        });
      }
    }

    // Fact: Humidity
    if (currentWeather.humidity >= 85) {
      result.push({
        icon: <Droplets className="w-4 h-4" />,
        text: `Humidity is at ${currentWeather.humidity}% — it feels muggy out there`,
        color: "text-cyan-400",
      });
    } else if (currentWeather.humidity <= 30) {
      result.push({
        icon: <Droplets className="w-4 h-4" />,
        text: `Very dry air today at ${currentWeather.humidity}% humidity — stay hydrated`,
        color: "text-amber-400",
      });
    }

    // Fact: Wind
    if (wind > 40) {
      result.push({
        icon: <Wind className="w-4 h-4" />,
        text: `Strong winds of ${wind} ${windUnit} — hold onto your hat!`,
        color: "text-teal-400",
      });
    } else if (wind < 5) {
      result.push({
        icon: <Wind className="w-4 h-4" />,
        text: `Nearly calm winds today at just ${wind} ${windUnit}`,
        color: "text-green-400",
      });
    }

    // Fact: UV Index
    if (currentWeather.uvIndex >= 8) {
      result.push({
        icon: <Sun className="w-4 h-4" />,
        text: `UV Index is very high at ${currentWeather.uvIndex} — sunscreen is essential`,
        color: "text-red-400",
      });
    }

    // Fact: Visibility
    if (currentWeather.visibility && currentWeather.visibility < 3) {
      const vis = isImperial ? currentWeather.visibility : Math.round(currentWeather.visibility * 1.609);
      result.push({
        icon: <Eye className="w-4 h-4" />,
        text: `Poor visibility at ${vis} ${isImperial ? "miles" : "km"} — drive carefully`,
        color: "text-gray-400",
      });
    }

    // Fact: Temperature swing in hourly
    if (hourlyForecast && hourlyForecast.length >= 12) {
      const next12 = hourlyForecast.slice(0, 12).map((h: any) =>
        isImperial ? h.temperature : Math.round((h.temperature - 32) * 5 / 9)
      );
      const swing = Math.max(...next12) - Math.min(...next12);
      if (swing >= 15) {
        result.push({
          icon: <BarChart3 className="w-4 h-4" />,
          text: `Big temperature swing ahead — ${swing}${unit} difference in the next 12 hours`,
          color: "text-purple-400",
        });
      }
    }

    return result.slice(0, 4); // Max 4 facts
  }, [currentWeather, dailyForecast, hourlyForecast, locationName, isImperial]);

  if (facts.length === 0) return null;

  return (
    <div className="rounded-2xl glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Weather Stats</h3>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {facts.map((fact, i) => (
          <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30">
            <div className={`mt-0.5 ${fact.color}`}>{fact.icon}</div>
            <p className="text-sm text-foreground/90 leading-snug">{fact.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
