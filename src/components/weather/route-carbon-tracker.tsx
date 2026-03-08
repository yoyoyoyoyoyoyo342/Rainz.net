import React from 'react';
import { Leaf, Flame, Car } from 'lucide-react';

interface RouteCarbonTrackerProps {
  distanceMeters: number;
  durationSeconds: number;
  transportMode: 'driving' | 'cycling' | 'walking';
  isImperial: boolean;
}

export function RouteCarbonTracker({ distanceMeters, durationSeconds, transportMode, isImperial }: RouteCarbonTrackerProps) {
  const km = distanceMeters / 1000;

  // Estimates
  const caloriesPerKm = { walking: 65, cycling: 30, driving: 0 };
  const co2PerKm = { driving: 120, cycling: 0, walking: 0 }; // grams

  const calories = Math.round(km * caloriesPerKm[transportMode]);
  const co2Grams = Math.round(km * co2PerKm[transportMode]);

  if (transportMode === 'driving') {
    return (
      <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-[10px] text-muted-foreground">
        <Car className="w-3 h-3" />
        <span>~{co2Grams}g CO₂</span>
        <span className="text-[9px]">·</span>
        <span className="text-green-500">
          Walk saves {Math.round(km * caloriesPerKm.walking)} cal 🌱
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-[10px] text-muted-foreground">
      <Flame className="w-3 h-3 text-orange-400" />
      <span className="font-medium">~{calories} cal</span>
      <span className="text-[9px]">·</span>
      <Leaf className="w-3 h-3 text-green-500" />
      <span className="text-green-500 font-medium">Zero emissions</span>
    </div>
  );
}
