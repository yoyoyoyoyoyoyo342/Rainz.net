import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CloudRain, Thermometer, Wind, ArrowRight } from "lucide-react";
import { HourlyForecast } from "@/types/weather";

interface Props {
  hourly: HourlyForecast[];
  isImperial?: boolean;
  is24Hour?: boolean;
}

interface InflectionPoint {
  type: "rain" | "temp" | "wind";
  label: string;
  time: string;
  hoursAway: number;
}

export function PredictiveTimeline({ hourly, isImperial = true, is24Hour = true }: Props) {
  const points = useMemo<InflectionPoint[]>(() => {
    if (!hourly || hourly.length < 4) return [];
    const slice = hourly.slice(0, 12);
    const out: InflectionPoint[] = [];

    // Rain start: first hour where precipitation rises above 30%
    const rainStart = slice.findIndex((h, i) => i > 0 && h.precipitation >= 30 && slice[i - 1].precipitation < 30);
    if (rainStart > 0) {
      out.push({ type: "rain", label: "Rain likely", time: slice[rainStart].time, hoursAway: rainStart });
    }

    // Temp drop: biggest negative delta of 3°+ within window
    let biggestDrop = 0;
    let dropIdx = -1;
    for (let i = 1; i < slice.length; i++) {
      const d = slice[i].temperature - slice[0].temperature;
      if (d < biggestDrop) {
        biggestDrop = d;
        dropIdx = i;
      }
    }
    const dropThreshold = isImperial ? 5 : 3;
    if (dropIdx > 0 && Math.abs(biggestDrop) >= dropThreshold) {
      const delta = Math.round(isImperial ? biggestDrop : (biggestDrop * 5) / 9);
      out.push({
        type: "temp",
        label: `${delta}° shift`,
        time: slice[dropIdx].time,
        hoursAway: dropIdx,
      });
    }

    // Wind shift: hour where wind jumps >50% vs current
    const baseWind = slice[0].windSpeed ?? 0;
    const windIdx = slice.findIndex((h, i) => i > 0 && (h.windSpeed ?? 0) > baseWind * 1.5 && (h.windSpeed ?? 0) > 10);
    if (windIdx > 0) {
      out.push({
        type: "wind",
        label: `Gusts to ${Math.round(slice[windIdx].windSpeed ?? 0)}`,
        time: slice[windIdx].time,
        hoursAway: windIdx,
      });
    }

    return out.slice(0, 3);
  }, [hourly, isImperial]);

  if (points.length === 0) return null;

  const iconFor = (t: InflectionPoint["type"]) =>
    t === "rain" ? CloudRain : t === "temp" ? Thermometer : Wind;

  const formatTime = (iso: string, hoursAway: number) => {
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString(undefined, is24Hour ? { hour: "2-digit", minute: "2-digit", hour12: false } : { hour: "numeric", hour12: true });
      }
    } catch {}
    return `+${hoursAway}h`;
  };

  return (
    <Card className="mb-4 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Predictive Timeline</h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Next 12h</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {points.map((p, i) => {
            const Icon = iconFor(p.type);
            return (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 min-w-[100px]">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(p.time, p.hoursAway)}</span>
                </div>
                {i < points.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
