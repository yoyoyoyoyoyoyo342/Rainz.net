import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Happy', color: 'bg-yellow-500/20 border-yellow-500/40' },
  { emoji: '😴', label: 'Sleepy', color: 'bg-blue-500/20 border-blue-500/40' },
  { emoji: '😤', label: 'Irritated', color: 'bg-red-500/20 border-red-500/40' },
  { emoji: '🥶', label: 'Cold', color: 'bg-cyan-500/20 border-cyan-500/40' },
  { emoji: '🥵', label: 'Hot', color: 'bg-orange-500/20 border-orange-500/40' },
  { emoji: '😌', label: 'Calm', color: 'bg-green-500/20 border-green-500/40' },
  { emoji: '🤧', label: 'Sneezy', color: 'bg-purple-500/20 border-purple-500/40' },
  { emoji: '⚡', label: 'Energized', color: 'bg-amber-500/20 border-amber-500/40' },
];

interface MoodEntry {
  date: string;
  mood: string;
  temp?: number;
  condition?: string;
}

interface WeatherMoodJournalProps {
  currentWeather?: any;
  isImperial?: boolean;
}

export function WeatherMoodJournal({ currentWeather, isImperial }: WeatherMoodJournalProps) {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const [entries, setEntries] = useState<MoodEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rainz-mood-journal') || '[]');
    } catch { return []; }
  });

  const todayEntry = entries.find(e => e.date === today);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('rainz-mood-journal', JSON.stringify(entries));
  }, [entries]);

  const logMood = (emoji: string) => {
    const entry: MoodEntry = {
      date: today,
      mood: emoji,
      temp: currentWeather?.temperature,
      condition: currentWeather?.condition,
    };
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, entry].slice(-90); // Keep 90 days
    });
  };

  const insight = useMemo(() => {
    if (entries.length < 5) return null;
    const moodCounts: Record<string, { count: number; avgTemp: number; temps: number[] }> = {};
    entries.forEach(e => {
      if (!moodCounts[e.mood]) moodCounts[e.mood] = { count: 0, avgTemp: 0, temps: [] };
      moodCounts[e.mood].count++;
      if (e.temp) moodCounts[e.mood].temps.push(e.temp);
    });
    Object.values(moodCounts).forEach(m => {
      m.avgTemp = m.temps.length ? Math.round(m.temps.reduce((a, b) => a + b, 0) / m.temps.length) : 0;
    });
    const top = Object.entries(moodCounts).sort((a, b) => b[1].count - a[1].count)[0];
    if (top && top[1].avgTemp) {
      const unit = isImperial ? '°F' : '°C';
      return `${t('mood.insightPrefix')} ${top[0]} ${t('mood.insightAt')} ${top[1].avgTemp}${unit}`;
    }
    return null;
  }, [entries, isImperial, t]);

  // Last 7 days mini calendar
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = entries.find(e => e.date === key);
      days.push({ date: key, day: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2), entry });
    }
    return days;
  }, [entries]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">📝</span>
          {t('mood.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!todayEntry ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">{t('mood.howFeeling')}</p>
            <div className="grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.emoji}
                  onClick={() => logMood(m.emoji)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:scale-105",
                    "bg-muted/20 border-border/30 hover:border-primary/40"
                  )}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <span className="text-4xl">{todayEntry.mood}</span>
            <p className="text-xs text-muted-foreground mt-1">{t('mood.logged')}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-xs h-7"
              onClick={() => logMood(todayEntry.mood === '😊' ? '😴' : '😊')}
            >
              {t('mood.change')}
            </Button>
          </div>
        )}

        {/* Mini week view */}
        <div className="flex justify-between mt-3 gap-1">
          {last7.map(d => (
            <div key={d.date} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-muted-foreground">{d.day}</span>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm",
                d.entry ? "bg-primary/10" : "bg-muted/20"
              )}>
                {d.entry?.entry?.mood || d.entry?.mood || '·'}
              </div>
            </div>
          ))}
        </div>

        {insight && (
          <div className="mt-3 p-2 rounded-lg bg-accent/30 text-xs text-center text-accent-foreground">
            💡 {insight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
