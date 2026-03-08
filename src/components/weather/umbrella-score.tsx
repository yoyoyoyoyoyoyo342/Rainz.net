import React from 'react';
import { Umbrella } from 'lucide-react';

interface UmbrellaScoreProps {
  rainScore: number;
  compact?: boolean;
}

function getUmbrellaRating(rainScore: number): { count: number; label: string; color: string } {
  if (rainScore < 10) return { count: 1, label: 'Bone Dry', color: 'text-green-500' };
  if (rainScore < 30) return { count: 2, label: 'Mostly Dry', color: 'text-emerald-400' };
  if (rainScore < 50) return { count: 3, label: 'Light Showers', color: 'text-yellow-500' };
  if (rainScore < 75) return { count: 4, label: 'Rainy', color: 'text-orange-500' };
  return { count: 5, label: 'Bring a Raincoat', color: 'text-red-500' };
}

export function UmbrellaScore({ rainScore, compact = false }: UmbrellaScoreProps) {
  const { count, label, color } = getUmbrellaRating(rainScore);

  if (compact) {
    return (
      <span className={`flex items-center gap-0.5 ${color}`} title={label}>
        {Array.from({ length: count }).map((_, i) => (
          <Umbrella key={i} className="w-3 h-3" />
        ))}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-xs">
      <div className={`flex items-center gap-0.5 ${color}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Umbrella
            key={i}
            className={`w-3.5 h-3.5 transition-opacity ${i < count ? 'opacity-100' : 'opacity-20'}`}
          />
        ))}
      </div>
      <span className={`font-semibold ${color}`}>{label}</span>
    </div>
  );
}
