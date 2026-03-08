import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Umbrella, Sun, Wind, Snowflake, CloudRain, Shirt, Glasses } from 'lucide-react';

interface OutfitItem {
  icon: React.ReactNode;
  label: string;
  reason: string;
}

interface OutfitRecommenderProps {
  currentWeather: any;
  isImperial: boolean;
}

export function OutfitRecommender({ currentWeather, isImperial }: OutfitRecommenderProps) {
  const { t } = useLanguage();

  const items = useMemo(() => {
    if (!currentWeather) return [];
    const result: OutfitItem[] = [];
    const temp = currentWeather.temperature;
    const feelsLike = currentWeather.feelsLike || temp;
    const rain = currentWeather.precipitationProbability || 0;
    const wind = currentWeather.windSpeed || 0;
    const uv = currentWeather.uvIndex || 0;
    const snow = currentWeather.snowfall || 0;

    // Cold thresholds (imperial)
    const coldThresh = isImperial ? 45 : 7;
    const coolThresh = isImperial ? 60 : 16;
    const warmThresh = isImperial ? 75 : 24;
    const hotThresh = isImperial ? 85 : 29;

    if (feelsLike < coldThresh) {
      result.push({ icon: <Snowflake className="w-5 h-5 text-cyan-400" />, label: t('outfit.heavyCoat'), reason: t('outfit.coldOut') });
      result.push({ icon: <Shirt className="w-5 h-5 text-muted-foreground" />, label: t('outfit.layers'), reason: t('outfit.layerUp') });
    } else if (feelsLike < coolThresh) {
      result.push({ icon: <Shirt className="w-5 h-5 text-blue-400" />, label: t('outfit.lightJacket'), reason: t('outfit.coolish') });
    } else if (feelsLike > hotThresh) {
      result.push({ icon: <Sun className="w-5 h-5 text-orange-400" />, label: t('outfit.lightClothes'), reason: t('outfit.hotOut') });
    }

    if (rain > 40) {
      result.push({ icon: <Umbrella className="w-5 h-5 text-blue-500" />, label: t('outfit.umbrella'), reason: `${rain}% ${t('outfit.rainChance')}` });
      result.push({ icon: <CloudRain className="w-5 h-5 text-blue-400" />, label: t('outfit.waterproof'), reason: t('outfit.stayDry') });
    }

    if (uv >= 6) {
      result.push({ icon: <Glasses className="w-5 h-5 text-yellow-500" />, label: t('outfit.sunglasses'), reason: `UV ${uv}` });
      result.push({ icon: <Sun className="w-5 h-5 text-yellow-400" />, label: t('outfit.sunscreen'), reason: t('outfit.protectSkin') });
    } else if (uv >= 3) {
      result.push({ icon: <Glasses className="w-5 h-5 text-yellow-400" />, label: t('outfit.sunglasses'), reason: `UV ${uv}` });
    }

    if (wind > 20) {
      result.push({ icon: <Wind className="w-5 h-5 text-slate-400" />, label: t('outfit.windbreaker'), reason: t('outfit.windy') });
    }

    if (snow > 0) {
      result.push({ icon: <Snowflake className="w-5 h-5 text-blue-300" />, label: t('outfit.boots'), reason: t('outfit.snowExpected') });
    }

    if (result.length === 0) {
      result.push({ icon: <Shirt className="w-5 h-5 text-green-400" />, label: t('outfit.anythingGoes'), reason: t('outfit.niceDay') });
    }

    return result.slice(0, 5);
  }, [currentWeather, isImperial, t]);

  if (!currentWeather) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">👗</span>
          {t('outfit.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-muted/20 border border-border/20">
              <div className="w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
