import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint, AlertTriangle, ThermometerSun, Droplets, Wind } from 'lucide-react';

interface PetWeatherAdvisoryProps {
  currentWeather: any;
  isImperial: boolean;
}

interface Advisory {
  icon: string;
  title: string;
  description: string;
  severity: 'safe' | 'caution' | 'danger';
}

export function PetWeatherAdvisory({ currentWeather, isImperial }: PetWeatherAdvisoryProps) {
  const temp = currentWeather?.temperature ?? 32;
  const condition = (currentWeather?.condition ?? '').toLowerCase();
  const wind = currentWeather?.windSpeed ?? 0;
  const uv = currentWeather?.uvIndex ?? 0;
  const humidity = currentWeather?.humidity ?? 50;

  const getAdvisories = (): Advisory[] => {
    const advisories: Advisory[] = [];
    const tempC = isImperial ? (temp - 32) * 5 / 9 : temp;

    // Hot pavement
    if (tempC > 30) {
      advisories.push({
        icon: '🐾',
        title: 'Hot Pavement Alert',
        description: `Ground temp can reach ${Math.round(tempC * 1.5)}°${isImperial ? 'F' : 'C'}! Walk pets on grass and early morning/late evening only.`,
        severity: tempC > 38 ? 'danger' : 'caution',
      });
    }

    // Heatstroke risk
    if (tempC > 27) {
      advisories.push({
        icon: '🥵',
        title: 'Heatstroke Risk',
        description: 'Keep pets hydrated, provide shade, and NEVER leave them in cars. Short-nosed breeds are extra vulnerable.',
        severity: tempC > 35 ? 'danger' : 'caution',
      });
    }

    // Cold weather
    if (tempC < 5) {
      advisories.push({
        icon: '🧥',
        title: 'Cold Weather Gear',
        description: tempC < -5
          ? 'Limit outdoor time! Small dogs and short-haired breeds need coats. Check paws for ice.'
          : 'Consider a dog sweater for smaller breeds. Wipe paws after walks to remove salt.',
        severity: tempC < -10 ? 'danger' : 'caution',
      });
    }

    // Rain
    if (condition.includes('rain') || condition.includes('drizzle')) {
      advisories.push({
        icon: '☔',
        title: 'Rainy Walk Tips',
        description: 'Dry pets thoroughly after walks. Use a doggy raincoat. Watch for puddles with chemicals.',
        severity: 'safe',
      });
    }

    // Thunder
    if (condition.includes('thunder') || condition.includes('storm')) {
      advisories.push({
        icon: '😰',
        title: 'Storm Anxiety Alert',
        description: 'Create a safe space indoors. Use white noise. Don\'t leave pets outside. Consider calming aids.',
        severity: 'caution',
      });
    }

    // Snow/ice
    if (condition.includes('snow') || condition.includes('ice')) {
      advisories.push({
        icon: '❄️',
        title: 'Snow & Ice Safety',
        description: 'Antifreeze is toxic! Clean paws after walks. Shorter walks for small breeds. Check for ice between toes.',
        severity: 'caution',
      });
    }

    // High UV
    if (uv >= 6) {
      advisories.push({
        icon: '☀️',
        title: 'UV Protection Needed',
        description: 'Pets with light fur/skin can sunburn! Apply pet-safe sunscreen on nose & ear tips.',
        severity: uv >= 8 ? 'caution' : 'safe',
      });
    }

    // Strong wind
    if (wind > (isImperial ? 25 : 40)) {
      advisories.push({
        icon: '💨',
        title: 'High Winds',
        description: 'Strong gusts can spook pets and blow debris. Keep cats indoors. Short leash for walks.',
        severity: 'caution',
      });
    }

    // Perfect weather
    if (advisories.length === 0) {
      advisories.push({
        icon: '🐕',
        title: 'Perfect Pet Weather!',
        description: 'Great conditions for outdoor adventures with your furry friend. Enjoy a nice long walk!',
        severity: 'safe',
      });
    }

    return advisories;
  };

  const advisories = getAdvisories();
  const severityColors = {
    safe: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    caution: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PawPrint className="w-4 h-4 text-primary" />
          Pet Weather Advisory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {advisories.map((advisory, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 border ${severityColors[advisory.severity]}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{advisory.icon}</span>
              <div>
                <p className="text-xs font-semibold">{advisory.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{advisory.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
