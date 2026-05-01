import { useMemo } from "react";
import { HourlyForecast } from "@/types/weather";
import { useLanguage } from "@/contexts/language-context";

interface UVIndexGraphProps {
  currentUV: number;
  hourlyForecast: HourlyForecast[];
}

const LEVELS = [
  { label: "extreme", min: 11, color: "hsl(280 70% 60%)" },
  { label: "veryHigh", min: 8, color: "hsl(0 80% 60%)" },
  { label: "high", min: 6, color: "hsl(20 90% 55%)" },
  { label: "moderate", min: 3, color: "hsl(45 95% 55%)" },
  { label: "low", min: 0, color: "hsl(140 65% 50%)" },
];

function levelFor(uv: number) {
  return LEVELS.find((l) => uv >= l.min) ?? LEVELS[LEVELS.length - 1];
}

export function UVIndexGraph({ currentUV, hourlyForecast }: UVIndexGraphProps) {
  const { t } = useLanguage();

  // Build a 24-hour series anchored to today (0..23 hours).
  const series = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const points: { hour: number; uv: number }[] = [];

    for (let h = 0; h < 24; h++) points.push({ hour: h, uv: 0 });

    // Map hourly forecast entries (next ~24h) onto today's hours where possible.
    hourlyForecast.slice(0, 24).forEach((hf, i) => {
      const guess = new Date(now);
      guess.setHours(now.getHours() + i, 0, 0, 0);
      if (
        guess.getFullYear() === startOfDay.getFullYear() &&
        guess.getMonth() === startOfDay.getMonth() &&
        guess.getDate() === startOfDay.getDate()
      ) {
        const hr = guess.getHours();
        points[hr] = { hour: hr, uv: Math.max(0, hf.uvIndex ?? 0) };
      }
    });

    // Ensure current hour reflects currentUV
    points[now.getHours()] = {
      hour: now.getHours(),
      uv: Math.max(points[now.getHours()].uv, currentUV),
    };

    return points;
  }, [hourlyForecast, currentUV]);

  const currentHour = new Date().getHours();
  const maxUV = Math.max(11, ...series.map((p) => p.uv));
  const W = 320;
  const H = 140;
  const PAD_L = 8;
  const PAD_R = 8;
  const innerW = W - PAD_L - PAD_R;
  const xFor = (h: number) => PAD_L + (h / 23) * innerW;
  const yFor = (uv: number) => H - (uv / maxUV) * H;

  // Smooth path
  const linePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.hour).toFixed(1)} ${yFor(p.uv).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(23)} ${H} L ${xFor(0)} ${H} Z`;

  const current = levelFor(currentUV);
  const currentX = xFor(currentHour);
  const currentY = yFor(series[currentHour].uv);

  const tickHours = [0, 6, 12, 18];
  const yTicks = [0, 3, 6, 8, 11];

  return (
    <div className="space-y-4">
      {/* Headline value */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold leading-none text-foreground">
          {currentUV}
        </span>
        <span className="text-2xl font-semibold text-foreground/90">
          {t(`uv.${current.label}`)}
        </span>
      </div>

      {/* Graph */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H + 22}`}
          className="w-full h-44"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="uv-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0 80% 60%)" stopOpacity="0.45" />
              <stop offset="40%" stopColor="hsl(45 95% 55%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(140 65% 50%)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="uv-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(140 65% 50%)" />
              <stop offset="50%" stopColor="hsl(45 95% 55%)" />
              <stop offset="100%" stopColor="hsl(0 80% 60%)" />
            </linearGradient>
          </defs>

          {/* Y grid */}
          {yTicks.map((v) => (
            <line
              key={v}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeDasharray="2 3"
              opacity="0.5"
            />
          ))}

          {/* Filled area */}
          <path d={areaPath} fill="url(#uv-area)" />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#uv-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current marker */}
          <line
            x1={currentX}
            x2={currentX}
            y1={0}
            y2={H}
            stroke="hsl(var(--foreground))"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="6"
            fill="hsl(var(--background))"
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
          />

          {/* X-axis labels */}
          {tickHours.map((h) => (
            <text
              key={h}
              x={xFor(h)}
              y={H + 16}
              fontSize="10"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {String(h).padStart(2, "0")}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {LEVELS.slice().reverse().map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span>
              {t(`uv.${l.label}`)} {l.min}+
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
