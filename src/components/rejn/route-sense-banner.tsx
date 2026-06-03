import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Umbrella, ArrowRight } from "lucide-react";
import { HourlyForecast } from "@/types/weather";

interface Props {
  hourly: HourlyForecast[];
  is24Hour?: boolean;
}

export function RouteSenseBanner({ hourly, is24Hour = true }: Props) {
  const navigate = useNavigate();

  const window = useMemo(() => {
    if (!hourly || hourly.length < 3) return null;
    const slice = hourly.slice(0, 8);
    // Find longest run of dry hours (precip < 20%)
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;
    slice.forEach((h, i) => {
      if (h.precipitation < 20) {
        if (curStart < 0) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestLen = curLen;
          bestStart = curStart;
        }
      } else {
        curStart = -1;
        curLen = 0;
      }
    });
    if (bestLen < 2) return null;
    return { start: slice[bestStart], len: bestLen };
  }, [hourly]);

  if (!window) return null;

  const startTime = (() => {
    try {
      const d = new Date(window.start.time);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString(undefined, is24Hour ? { hour: "2-digit", minute: "2-digit", hour12: false } : { hour: "numeric", hour12: true });
      }
    } catch {}
    return window.start.time;
  })();

  return (
    <button
      onClick={() => navigate("/dryroutes")}
      className="w-full mb-4 group flex items-center gap-3 p-3 rounded-2xl glass-card border border-border/30 hover:border-primary/40 transition-all text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Umbrella className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">Route Sense</div>
        <div className="text-sm text-foreground truncate">
          Best dry window: <span className="font-bold">{startTime}</span> · {window.len}h clear
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <MapPin className="w-3 h-3" />
        <span className="hidden sm:inline">Plan route</span>
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
