import React, { useState } from 'react';
import { Clock, Sun, CloudRain, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DryWindowsProps {
  fromCoords: [number, number];
  toCoords: [number, number];
  routeGeometry: [number, number][];
  isImperial: boolean;
}

interface TimeWindow {
  hour: number;
  label: string;
  rainScore: number;
}

export function DryWindows({ fromCoords, toCoords, routeGeometry, isImperial }: DryWindowsProps) {
  const [windows, setWindows] = useState<TimeWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [bestWindow, setBestWindow] = useState<TimeWindow | null>(null);

  const calculateDryWindows = async () => {
    setLoading(true);
    try {
      // Sample 5 points along the route
      const sampleCount = Math.min(5, routeGeometry.length);
      const step = Math.max(1, Math.floor(routeGeometry.length / sampleCount));
      const samplePoints = Array.from({ length: sampleCount }, (_, i) =>
        routeGeometry[Math.min(i * step, routeGeometry.length - 1)]
      );

      // Fetch 12-hour forecast for each sample point
      const forecasts = await Promise.all(
        samplePoints.map(async ([lat, lon]) => {
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_hours=12&timezone=auto`
            );
            const data = await res.json();
            return data?.hourly?.precipitation_probability || [];
          } catch {
            return [];
          }
        })
      );

      // For each hour, average rain probability across all sample points
      const now = new Date();
      const timeWindows: TimeWindow[] = [];

      for (let h = 0; h < 12; h++) {
        let totalProb = 0;
        let count = 0;
        for (const forecast of forecasts) {
          if (forecast[h] !== undefined) {
            totalProb += forecast[h];
            count++;
          }
        }
        const avgRain = count > 0 ? Math.round(totalProb / count) : 0;
        const departureTime = new Date(now.getTime() + h * 3600000);
        const label = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        timeWindows.push({ hour: h, label, rainScore: avgRain });
      }

      setWindows(timeWindows);
      const best = timeWindows.reduce((a, b) => (a.rainScore <= b.rainScore ? a : b));
      setBestWindow(best);
    } catch (err) {
      console.error('Failed to calculate dry windows:', err);
    }
    setLoading(false);
  };

  const getRainColor = (score: number) => {
    if (score < 20) return 'bg-green-500';
    if (score < 40) return 'bg-emerald-400';
    if (score < 60) return 'bg-yellow-400';
    if (score < 80) return 'bg-orange-400';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs"
        onClick={calculateDryWindows}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing 12 hours...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Find Best Time to Leave</>
        )}
      </Button>

      {bestWindow && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            <span className="font-semibold">Best departure: {bestWindow.label}</span>
            <span className={`ml-auto font-bold ${bestWindow.rainScore < 30 ? 'text-green-500' : bestWindow.rainScore < 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {bestWindow.rainScore}% rain
            </span>
          </div>
        </div>
      )}

      {windows.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">Next 12 hours</p>
          <div className="flex gap-0.5 h-10 items-end">
            {windows.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm transition-all ${getRainColor(w.rainScore)} ${bestWindow?.hour === i ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  style={{ height: `${Math.max(4, w.rainScore * 0.4)}px`, opacity: 0.7 + (w.rainScore / 100) * 0.3 }}
                  title={`${w.label}: ${w.rainScore}% rain`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>{windows[0]?.label}</span>
            <span>{windows[Math.floor(windows.length / 2)]?.label}</span>
            <span>{windows[windows.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
