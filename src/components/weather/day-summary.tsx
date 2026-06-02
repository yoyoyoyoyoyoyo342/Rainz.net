import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  day: string;
  highTemp: number;       // Fahrenheit (raw)
  lowTemp: number;        // Fahrenheit (raw)
  condition: string;
  precipitation?: number;
  windSpeed?: number;
  uvIndex?: number;
  certainty?: number;
  isImperial?: boolean;
  location?: string;
}

const CACHE_PREFIX = "rejn_day_summary_v1::";
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export function DaySummary({
  day, highTemp, lowTemp, condition, precipitation, windSpeed, uvIndex, certainty, isImperial, location,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const high = isImperial ? Math.round(highTemp) : Math.round((highTemp - 32) * 5 / 9);
  const low = isImperial ? Math.round(lowTemp) : Math.round((lowTemp - 32) * 5 / 9);

  useEffect(() => {
    const key = `${CACHE_PREFIX}${location || "loc"}::${day}::${condition}::${high}::${low}::${isImperial ? "F" : "C"}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.t && Date.now() - parsed.t < TTL_MS && parsed.s) {
          setSummary(parsed.s);
          return;
        }
      }
    } catch { /* ignore */ }

    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("ai-day-summary", {
        body: {
          day, location,
          highTemp: high, lowTemp: low,
          condition, precipitation, windSpeed, uvIndex, certainty,
          isImperial,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const s = data?.summary;
        if (s) {
          setSummary(s);
          try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), s })); } catch { /* ignore */ }
        }
      })
      .catch(() => { /* graceful fail */ })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, condition, high, low, isImperial, location]);

  if (!summary && !loading) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
      <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-foreground/90 leading-relaxed">
        {summary || "Rejn is thinking…"}
      </p>
    </div>
  );
}
