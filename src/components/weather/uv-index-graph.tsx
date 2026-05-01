import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { HourlyForecast } from "@/types/weather";
import { useLanguage } from "@/contexts/language-context";

interface UVIndexGraphProps {
  currentUV: number;
  hourlyForecast: HourlyForecast[];
  is24Hour?: boolean;
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

function formatHour(h: number, is24Hour: boolean) {
  if (is24Hour) return `${String(h).padStart(2, "0")}:00`;
  const hr = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hr}:00 ${ampm}`;
}

export function UVIndexGraph({ currentUV, hourlyForecast, is24Hour = true }: UVIndexGraphProps) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentHour = new Date().getHours();
  const [selectedHour, setSelectedHour] = useState<number>(currentHour);
  const [dragging, setDragging] = useState(false);

  // Build a 24-hour series anchored to today (0..23 hours) using AI-enhanced ensemble data.
  const series = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const points: { hour: number; uv: number }[] = [];

    for (let h = 0; h < 24; h++) points.push({ hour: h, uv: 0 });

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

    points[currentHour] = {
      hour: currentHour,
      uv: Math.max(points[currentHour].uv, currentUV),
    };

    return points;
  }, [hourlyForecast, currentUV, currentHour]);

  const maxUV = Math.max(11, ...series.map((p) => p.uv));
  const W = 320;
  const H = 140;
  const PAD_L = 8;
  const PAD_R = 8;
  const innerW = W - PAD_L - PAD_R;
  const xFor = (h: number) => PAD_L + (h / 23) * innerW;
  const yFor = (uv: number) => H - (uv / maxUV) * H;

  const linePath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.hour).toFixed(1)} ${yFor(p.uv).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(23)} ${H} L ${xFor(0)} ${H} Z`;

  const selectedUV = Math.round(series[selectedHour]?.uv ?? 0);
  const selectedLevel = levelFor(selectedUV);
  const selectedX = xFor(selectedHour);
  const selectedY = yFor(series[selectedHour]?.uv ?? 0);
  const currentX = xFor(currentHour);

  const updateFromClientX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const xInVB = Math.max(PAD_L, Math.min(W - PAD_R, PAD_L + ratio * (W - PAD_L - PAD_R)));
    const hour = Math.round(((xInVB - PAD_L) / innerW) * 23);
    setSelectedHour(Math.max(0, Math.min(23, hour)));
  }, [innerW]);

  // Pointer events on window while dragging (mouse + pen)
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateFromClientX]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(true);
    // Capture pointer so we keep getting events even if finger leaves SVG bounds
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
    updateFromClientX(e.clientX);
  };

  const onPointerMoveSvg = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    e.preventDefault();
    updateFromClientX(e.clientX);
  };

  // Native touch handlers — needed because some mobile browsers swallow
  // pointer events for scrolling. We attach with passive:false so we can
  // preventDefault() and stop the page from scrolling while scrubbing.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      setDragging(true);
      updateFromClientX(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      updateFromClientX(e.touches[0].clientX);
    };
    const onTouchEnd = () => setDragging(false);

    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd);
    svg.addEventListener("touchcancel", onTouchEnd);
    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
      svg.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [updateFromClientX]);

  const tickHours = [0, 6, 12, 18];
  const yTicks = [0, 3, 6, 8, 11];
  const isNow = selectedHour === currentHour;

  return (
    <div className="space-y-4 select-none">
      {/* Headline value (reflects selected hour) */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold leading-none text-foreground">
          {selectedUV}
        </span>
        <div className="flex flex-col">
          <span className="text-xl font-semibold text-foreground/90 leading-tight">
            {t(`uv.${selectedLevel.label}`)}
          </span>
          <span className="text-xs text-muted-foreground">
            {isNow ? t('common.now') ?? 'Now' : ''} {formatHour(selectedHour, is24Hour)}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="relative touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H + 22}`}
          className="w-full h-44 cursor-grab active:cursor-grabbing"
          preserveAspectRatio="none"
          onPointerDown={onPointerDown}
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

          {/* Filled area + line */}
          <path d={areaPath} fill="url(#uv-area)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#uv-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current-hour subtle marker */}
          {!isNow && (
            <circle
              cx={currentX}
              cy={yFor(series[currentHour].uv)}
              r="3"
              fill="hsl(var(--foreground))"
              opacity="0.4"
            />
          )}

          {/* Selected (draggable) marker */}
          <line
            x1={selectedX}
            x2={selectedX}
            y1={0}
            y2={H}
            stroke="hsl(var(--primary))"
            strokeWidth="1.25"
            opacity="0.7"
          />
          <circle
            cx={selectedX}
            cy={selectedY}
            r="8"
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
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
