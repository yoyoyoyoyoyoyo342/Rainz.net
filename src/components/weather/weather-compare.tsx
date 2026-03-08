import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/language-context';
import { ArrowLeftRight, Loader2, Thermometer, Droplets, Wind, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CityWeather {
  name: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  condition: string;
  description: string;
}

export function WeatherCompare({ isImperial }: { isImperial: boolean }) {
  const { t } = useLanguage();
  const [cityA, setCityA] = useState('');
  const [cityB, setCityB] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ a: CityWeather; b: CityWeather } | null>(null);
  const [error, setError] = useState('');

  const fetchCity = async (name: string): Promise<CityWeather | null> => {
    try {
      const { data: geo } = await supabase.functions.invoke('geocode-address', { body: { address: name } });
      if (!geo?.results?.[0]) return null;
      const { lat, lon, display_name } = geo.results[0];
      const { data: weather } = await supabase.functions.invoke('aggregate-weather', {
        body: { latitude: lat, longitude: lon }
      });
      const w = weather?.aggregated?.currentWeather || weather?.mostAccurate?.currentWeather;
      if (!w) return null;
      return {
        name: display_name?.split(',')[0] || name,
        temp: Math.round(w.temperature),
        feelsLike: Math.round(w.feelsLike),
        humidity: w.humidity,
        wind: Math.round(w.windSpeed),
        condition: w.condition,
        description: w.description,
      };
    } catch { return null; }
  };

  const compare = async () => {
    if (!cityA.trim() || !cityB.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    const [a, b] = await Promise.all([fetchCity(cityA), fetchCity(cityB)]);
    setLoading(false);
    if (!a || !b) {
      setError(t('compare.notFound'));
      return;
    }
    setResults({ a, b });
  };

  const unit = isImperial ? '°F' : '°C';
  const windUnit = isImperial ? 'mph' : 'km/h';

  const verdict = results ? (() => {
    const diff = results.a.temp - results.b.temp;
    const warmer = diff > 0 ? results.a.name : results.b.name;
    const absDiff = Math.abs(diff);
    if (absDiff < 2) return `${t('compare.sameTemp')} 🤝`;
    return `${warmer} ${t('compare.is')} ${absDiff}${unit} ${t('compare.warmer')} 🌡️`;
  })() : '';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          {t('compare.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder={t('compare.city1')}
            value={cityA}
            onChange={e => setCityA(e.target.value)}
            className="text-sm h-9"
            onKeyDown={e => e.key === 'Enter' && compare()}
          />
          <span className="text-muted-foreground self-center text-xs font-bold">VS</span>
          <Input
            placeholder={t('compare.city2')}
            value={cityB}
            onChange={e => setCityB(e.target.value)}
            className="text-sm h-9"
            onKeyDown={e => e.key === 'Enter' && compare()}
          />
        </div>
        <Button onClick={compare} disabled={loading || !cityA.trim() || !cityB.trim()} className="w-full h-9 text-sm" size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('compare.button')}
        </Button>
        {error && <p className="text-xs text-destructive mt-2 text-center">{error}</p>}
        {results && (
          <div className="mt-3 space-y-2">
            <div className="text-center p-2 rounded-lg bg-primary/10 text-sm font-medium text-primary">
              {verdict}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[results.a, results.b].map((city, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/20 text-center">
                  <p className="text-sm font-semibold text-foreground truncate">{city.name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{city.temp}{unit}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{city.description}</p>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Droplets className="w-3 h-3" /> {city.humidity}%
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Wind className="w-3 h-3" /> {city.wind} {windUnit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
