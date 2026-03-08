import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2, CalendarDays } from 'lucide-react';

interface WeatherDejaVuProps {
  latitude: number;
  longitude: number;
  locationName: string;
  currentWeather: any;
  isImperial: boolean;
}

interface MatchResult {
  date: string;
  temp: number;
  condition: string;
  similarity: number;
}

export function WeatherDejaVu({ latitude, longitude, locationName, currentWeather, isImperial }: WeatherDejaVuProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const findMatches = async () => {
    setLoading(true);
    try {
      const currentTemp = currentWeather?.temperature ?? 32;
      const tempC = isImperial ? Math.round((currentTemp - 32) * 5 / 9) : currentTemp;
      
      // Fetch historical data from Open-Meteo archive for past years on same day
      const today = new Date();
      const results: MatchResult[] = [];
      
      for (let yearsBack = 1; yearsBack <= 5; yearsBack++) {
        const pastDate = new Date(today);
        pastDate.setFullYear(today.getFullYear() - yearsBack);
        const dateStr = pastDate.toISOString().split('T')[0];
        
        try {
          const res = await fetch(
            `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weather_code&timezone=auto`
          );
          const data = await res.json();
          
          if (data?.daily?.temperature_2m_mean?.[0] !== undefined) {
            const histTemp = data.daily.temperature_2m_mean[0];
            const histTempDisplay = isImperial ? Math.round(histTemp * 9/5 + 32) : Math.round(histTemp);
            const weatherCode = data.daily.weather_code?.[0] || 0;
            
            // Calculate similarity (0-100)
            const tempDiff = Math.abs(histTemp - tempC);
            const similarity = Math.max(0, Math.round(100 - tempDiff * 5));
            
            const conditionMap: Record<number, string> = {
              0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
              45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
              55: 'Heavy Drizzle', 61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
              71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Rain Showers',
              85: 'Snow Showers', 95: 'Thunderstorm',
            };
            
            results.push({
              date: dateStr,
              temp: histTempDisplay,
              condition: conditionMap[weatherCode] || 'Unknown',
              similarity,
            });
          }
        } catch {
          // Skip failed years
        }
      }
      
      results.sort((a, b) => b.similarity - a.similarity);
      setMatches(results);
      setSearched(true);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  };

  const getSimilarityColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Weather Déjà Vu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          When was the last time {locationName} had weather like today?
        </p>

        {searched && matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((match, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2 border border-border/20">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">
                      {new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{match.condition} · {match.temp}°{isImperial ? 'F' : 'C'}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${getSimilarityColor(match.similarity)}`}>
                  {match.similarity}% match
                </span>
              </div>
            ))}
          </div>
        )}

        {searched && matches.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No historical data found for this location.</p>
        )}

        <Button onClick={findMatches} disabled={loading} variant="outline" size="sm" className="w-full text-xs">
          {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Searching history...</> : '🔍 Find Weather Twins'}
        </Button>
      </CardContent>
    </Card>
  );
}
