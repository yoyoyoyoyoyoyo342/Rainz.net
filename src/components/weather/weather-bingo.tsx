import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BingoSquare {
  id: string;
  label: string;
  check: (weather: any, isImperial: boolean) => boolean;
}

const BINGO_POOL: BingoSquare[] = [
  { id: 'temp_drop5', label: 'Temp drops 5°+', check: (w) => w?.feelsLike && w.temperature - w.feelsLike >= 5 },
  { id: 'wind_20', label: 'Wind > 20mph', check: (w) => w?.windSpeed > 20 },
  { id: 'humidity_80', label: 'Humidity > 80%', check: (w) => w?.humidity > 80 },
  { id: 'uv_high', label: 'UV Index > 6', check: (w) => w?.uvIndex > 6 },
  { id: 'cloud_full', label: '100% Cloud Cover', check: (w) => w?.cloudCover >= 100 },
  { id: 'clear_sky', label: 'Clear Skies', check: (w) => w?.cloudCover !== undefined && w.cloudCover < 10 },
  { id: 'feels_cold', label: 'Feels < 32°F', check: (w, imp) => imp ? w?.feelsLike < 32 : w?.feelsLike < 0 },
  { id: 'feels_hot', label: 'Feels > 85°F', check: (w, imp) => imp ? w?.feelsLike > 85 : w?.feelsLike > 29 },
  { id: 'rain_likely', label: 'Rain > 50%', check: (w) => w?.precipitationProbability > 50 },
  { id: 'no_rain', label: '0% Rain Chance', check: (w) => w?.precipitationProbability === 0 },
  { id: 'pressure_high', label: 'Pressure > 1020', check: (w) => w?.pressure > 1020 },
  { id: 'pressure_low', label: 'Pressure < 1000', check: (w) => w?.pressure < 1000 },
  { id: 'wind_calm', label: 'Wind < 5mph', check: (w) => w?.windSpeed < 5 },
  { id: 'gusty', label: 'Gusts > 30mph', check: (w) => w?.windGusts > 30 },
  { id: 'dew_high', label: 'Dew Point > 65°F', check: (w, imp) => imp ? w?.dewPoint > 65 : w?.dewPoint > 18 },
  { id: 'vis_low', label: 'Visibility < 5mi', check: (w) => w?.visibility < 5 },
  { id: 'snowing', label: 'Snowfall!', check: (w) => w?.snowfall > 0 },
  { id: 'temp_70s', label: 'Temp in the 70s°F', check: (w, imp) => imp ? w?.temperature >= 70 && w.temperature < 80 : w?.temperature >= 21 && w.temperature < 27 },
  { id: 'humid_low', label: 'Humidity < 30%', check: (w) => w?.humidity < 30 },
  { id: 'uv_zero', label: 'UV Index = 0', check: (w) => w?.uvIndex === 0 },
  { id: 'precip_actual', label: 'Active Rain', check: (w) => w?.precipitation > 0 },
  { id: 'wind_north', label: 'N Wind Direction', check: (w) => w?.windDirection !== undefined && (w.windDirection < 45 || w.windDirection > 315) },
  { id: 'hot_day', label: 'Temp > 90°F', check: (w, imp) => imp ? w?.temperature > 90 : w?.temperature > 32 },
  { id: 'mild_day', label: 'Temp 55-65°F', check: (w, imp) => imp ? w?.temperature >= 55 && w.temperature <= 65 : w?.temperature >= 13 && w.temperature <= 18 },
  { id: 'aqi_good', label: 'Good Air Quality', check: (w) => w?.aqi !== undefined && w.aqi <= 50 },
];

function getDailyBoard(seed: string): BingoSquare[] {
  // Seeded shuffle
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const shuffled = [...BINGO_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const board = shuffled.slice(0, 24);
  // Insert FREE space at center (index 12)
  board.splice(12, 0, { id: 'free', label: '⭐ FREE', check: () => true });
  return board;
}

function checkBingo(completed: boolean[]): { lines: number; fullCard: boolean } {
  let lines = 0;
  // Rows
  for (let r = 0; r < 5; r++) {
    if ([0,1,2,3,4].every(c => completed[r * 5 + c])) lines++;
  }
  // Cols
  for (let c = 0; c < 5; c++) {
    if ([0,1,2,3,4].every(r => completed[r * 5 + c])) lines++;
  }
  // Diags
  if ([0,6,12,18,24].every(i => completed[i])) lines++;
  if ([4,8,12,16,20].every(i => completed[i])) lines++;
  return { lines, fullCard: completed.every(Boolean) };
}

interface WeatherBingoProps {
  currentWeather: any;
  isImperial: boolean;
}

export function WeatherBingo({ currentWeather, isImperial }: WeatherBingoProps) {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const board = useMemo(() => getDailyBoard(today), [today]);

  const [manualMarks, setManualMarks] = useState<boolean[]>(() => {
    try {
      const saved = localStorage.getItem(`rainz-bingo-${today}`);
      return saved ? JSON.parse(saved) : new Array(25).fill(false);
    } catch { return new Array(25).fill(false); }
  });

  const completed = useMemo(() => {
    return board.map((sq, i) => {
      if (sq.id === 'free') return true;
      if (manualMarks[i]) return true;
      if (currentWeather) {
        try { return sq.check(currentWeather, isImperial); } catch { return false; }
      }
      return false;
    });
  }, [board, currentWeather, isImperial, manualMarks]);

  useEffect(() => {
    localStorage.setItem(`rainz-bingo-${today}`, JSON.stringify(manualMarks));
  }, [manualMarks, today]);

  const { lines, fullCard } = useMemo(() => checkBingo(completed), [completed]);

  const toggleManual = (i: number) => {
    if (board[i].id === 'free') return;
    // If auto-completed, don't allow toggle
    if (currentWeather) {
      try { if (board[i].check(currentWeather, isImperial)) return; } catch {}
    }
    setManualMarks(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const completedCount = completed.filter(Boolean).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            {t('bingo.title')}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount}/25 • {lines} {t('bingo.lines')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {fullCard && (
          <div className="mb-2 text-center py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Trophy className="w-5 h-5 text-primary inline mr-1" />
            <span className="text-sm font-semibold text-primary">{t('bingo.fullCard')}</span>
          </div>
        )}
        {!fullCard && lines > 0 && (
          <div className="mb-2 text-center py-1.5 rounded-lg bg-accent/50 text-xs font-medium text-accent-foreground">
            🎉 {lines} {t('bingo.linesComplete')}!
          </div>
        )}
        <div className="grid grid-cols-5 gap-1">
          {board.map((sq, i) => {
            const done = completed[i];
            return (
              <button
                key={sq.id + i}
                onClick={() => toggleManual(i)}
                className={cn(
                  "aspect-square rounded-lg text-[9px] sm:text-[10px] leading-tight p-1 flex items-center justify-center text-center transition-all font-medium border",
                  done
                    ? "bg-primary/20 border-primary/40 text-primary dark:text-primary-foreground"
                    : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {sq.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {t('bingo.hint')}
        </p>
      </CardContent>
    </Card>
  );
}
