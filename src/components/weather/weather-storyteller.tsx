import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherStorytellerProps {
  currentWeather: any;
  locationName: string;
  isImperial: boolean;
}

const STORY_GENRES = ['🧙 Fantasy', '🕵️ Mystery', '🚀 Sci-Fi', '💕 Romance', '😂 Comedy'] as const;

export function WeatherStoryteller({ currentWeather, locationName, isImperial }: WeatherStorytellerProps) {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState<string>('🧙 Fantasy');

  const temp = currentWeather?.temperature;
  const condition = currentWeather?.condition || 'clear';
  const wind = currentWeather?.windSpeed;
  const humidity = currentWeather?.humidity;

  const generateStory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-weather-insights', {
        body: {
          prompt: `Write a very short (3-4 sentences) creative ${genre.slice(2)} micro-story inspired by today's weather in ${locationName}. The weather is: ${condition}, ${temp}°${isImperial ? 'F' : 'C'}, wind ${wind} ${isImperial ? 'mph' : 'km/h'}, humidity ${humidity}%. Make it vivid, imaginative, and weather-themed. End with a clever twist.`,
        },
      });
      if (error) throw error;
      setStory(data?.insight || data?.text || "The weather whispered its own tale today...");
    } catch {
      // Fallback stories based on condition
      const fallbacks: Record<string, string> = {
        clear: `The sun blazed over ${locationName} like a spotlight on an empty stage. A street musician began to play, and for a moment, even the shadows stopped to listen. By evening, the sky painted itself in colors no artist could name — as if the weather itself was applauding.`,
        rain: `Rain tapped on ${locationName}'s windows like a thousand tiny fingers asking to be let in. An old umbrella seller smiled — business was booming. But the real magic happened when the rain stopped: every puddle became a portal reflecting a sky that hadn't existed minutes ago.`,
        cloudy: `Clouds rolled over ${locationName} like a fleet of grey ships. The city held its breath, waiting. Then a single beam of sunlight pierced through, and a child pointed up and whispered: "The sky just winked at us."`,
        snow: `Snow fell on ${locationName} so softly it seemed the sky was sharing a secret. Footprints appeared and vanished like whispered conversations. By midnight, the entire city was wrapped in white silence — the world's most beautiful pause button.`,
      };
      const key = condition.toLowerCase().includes('rain') ? 'rain' 
        : condition.toLowerCase().includes('cloud') ? 'cloudy'
        : condition.toLowerCase().includes('snow') ? 'snow' : 'clear';
      setStory(fallbacks[key] || fallbacks.clear);
    }
    setLoading(false);
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Weather Storyteller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {STORY_GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                genre === g
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {story && (
          <div className="bg-muted/30 rounded-xl p-3 text-sm text-foreground/90 italic leading-relaxed border border-border/20">
            "{story}"
          </div>
        )}

        <Button
          onClick={generateStory}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Writing...</>
          ) : story ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> New Story</>
          ) : (
            <><BookOpen className="w-3.5 h-3.5 mr-1.5" /> Generate Story</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
