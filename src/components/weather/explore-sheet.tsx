import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
import { WeatherTimeMachine } from './weather-time-machine';
import { WeatherReactionsFeed } from './weather-reactions-feed';
import { WeatherTrendsCard } from './weather-trends-card';
import { StreakChallenge } from './streak-challenge';
import { LockedFeature } from '@/components/ui/locked-feature';
import { WeatherPersonalityQuiz } from './weather-personality-quiz';

interface ExploreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  locationName: string;
  currentWeather: any;
  isImperial: boolean;
  userId?: string;
}

export function ExploreSheet({
  open,
  onOpenChange,
  latitude,
  longitude,
  locationName,
  currentWeather,
  isImperial,
  userId,
}: ExploreSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>✨</span>
            Explore Rainz
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Weather Personality Quiz */}
          <WeatherPersonalityQuiz inSheet />

          {/* Weather Trends */}
          <LockedFeature isLocked={!userId}>
            <WeatherTrendsCard
              currentWeather={currentWeather}
              location={locationName}
              latitude={latitude}
              longitude={longitude}
              isImperial={isImperial}
            />
          </LockedFeature>

          {/* Weather Reactions Feed */}
          <WeatherReactionsFeed
            latitude={latitude}
            longitude={longitude}
            locationName={locationName}
          />

          {/* Time Machine */}
          <WeatherTimeMachine
            latitude={latitude}
            longitude={longitude}
            locationName={locationName}
            isImperial={isImperial}
          />

          {/* Streak Challenge */}
          {userId && (
            <StreakChallenge
              latitude={latitude}
              longitude={longitude}
              locationName={locationName}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ExploreButtonProps {
  onClick: () => void;
}

export function ExploreButton({ onClick }: ExploreButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl glass-card border border-border/30 hover:border-primary/40 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Explore Rainz ✨</p>
          <p className="text-xs text-muted-foreground">Time Machine · Reactions · Trends · Challenges</p>
        </div>
      </div>
      <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">→</span>
    </button>
  );
}
