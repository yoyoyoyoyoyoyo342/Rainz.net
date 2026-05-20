import { Cloud, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkyCamWeatherSource } from '@/types/skycam';

interface WeatherSourceLabelProps {
  source: SkyCamWeatherSource;
  updatedAt?: string | null;
  stationName?: string | null;
  className?: string;
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins === 1) return 'updated 1 min ago';
  if (mins < 60) return `updated ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? 'updated 1 hr ago' : `updated ${hrs} hrs ago`;
}

export function WeatherSourceLabel({
  source,
  updatedAt,
  stationName,
  className,
}: WeatherSourceLabelProps) {
  const rel = source === 'skycam' ? formatRelative(updatedAt) : null;
  const Icon = source === 'skycam' ? Cloud : Radio;
  const label = source === 'skycam' ? 'Data from SkyCam' : 'Data from API';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80 tracking-wide',
        className,
      )}
      title={stationName ?? undefined}
    >
      <Icon className="w-3 h-3 opacity-70" />
      <span>{label}</span>
      {rel && <span className="opacity-70">· {rel}</span>}
    </div>
  );
}
