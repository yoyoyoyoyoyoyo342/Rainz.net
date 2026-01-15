import { Badge } from "@/components/ui/badge";
import { Snowflake } from "lucide-react";

interface SnowIndexProps {
  snowData?: {
    snowfall: number;
    snowDepth: number;
    temperature: number;
    windChill: number;
    iceRisk: number;
    snowIntensity?: number;
    snowAccumulation?: number;
    iceAccumulation?: number;
  };
  isImperial?: boolean;
}

export function SnowIndex({ snowData, isImperial = false }: SnowIndexProps) {
  if (!snowData) {
    return (
      <div className="overflow-hidden rounded-2xl glass-card">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Snow Index</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">No snow data available</p>
        </div>
      </div>
    );
  }

  const getSnowfallLevel = (valueInInches: number) => {
    if (valueInInches === 0) return { label: 'No Snow', color: 'bg-slate-500' };
    if (valueInInches < 0.5) return { label: 'Light', color: 'bg-blue-400' };
    if (valueInInches < 2) return { label: 'Moderate', color: 'bg-blue-500' };
    if (valueInInches < 6) return { label: 'Heavy', color: 'bg-blue-700' };
    return { label: 'Extreme', color: 'bg-purple-700' };
  };

  const getIceRiskLevel = (value: number) => {
    if (value < 20) return { label: 'Low', color: 'bg-green-500' };
    if (value < 50) return { label: 'Medium', color: 'bg-yellow-500' };
    if (value < 80) return { label: 'High', color: 'bg-orange-500' };
    return { label: 'Extreme', color: 'bg-red-500' };
  };

  const actualSnowfall = snowData.snowIntensity !== undefined && snowData.snowIntensity > 0 
    ? snowData.snowIntensity 
    : snowData.snowfall;
  
  const actualSnowDepth = snowData.snowAccumulation !== undefined && snowData.snowAccumulation > 0
    ? snowData.snowAccumulation
    : snowData.snowDepth;

  const calculatedIceRisk = snowData.iceAccumulation !== undefined && snowData.iceAccumulation > 0
    ? Math.min(100, snowData.iceAccumulation * 100)
    : snowData.iceRisk;

  const snowfallLevel = getSnowfallLevel(actualSnowfall);
  const iceRiskLevel = getIceRiskLevel(calculatedIceRisk);

  const unit = isImperial ? '"' : 'cm';
  const tempUnit = isImperial ? '°F' : '°C';

  const snowfallDisplay = isImperial ? actualSnowfall : actualSnowfall * 2.54;
  const snowDepthDisplay = isImperial ? actualSnowDepth : actualSnowDepth * 2.54;
  const temperatureDisplay = isImperial ? snowData.temperature : (snowData.temperature - 32) * 5 / 9;
  const windChillDisplay = isImperial ? snowData.windChill : (snowData.windChill - 32) * 5 / 9;
  
  const snowMetrics = [
    {
      name: 'Snowfall',
      value: `${snowfallDisplay.toFixed(1)}${unit}`,
      level: snowfallLevel,
      icon: '❄️'
    },
    {
      name: 'Snow Depth',
      value: `${snowDepthDisplay.toFixed(1)}${unit}`,
      level: getSnowfallLevel(actualSnowDepth),
      icon: '🌨️'
    },
    {
      name: 'Ice Risk',
      value: `${Math.round(calculatedIceRisk)}%`,
      level: iceRiskLevel,
      icon: '🧊'
    },
    {
      name: 'Wind Chill',
      value: `${Math.round(windChillDisplay)}${tempUnit}`,
      level: { 
        label: windChillDisplay < (isImperial ? 0 : -18) ? 'Dangerous' : 'Cold', 
        color: windChillDisplay < (isImperial ? 0 : -18) ? 'bg-purple-700' : 'bg-blue-500' 
      },
      icon: '🌬️'
    }
  ];

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      {/* Header without gradient */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="font-semibold text-foreground">Snow Index</h3>
          </div>
          <span className="text-xs text-muted-foreground">Live conditions</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {snowMetrics.map((metric, idx) => (
            <div 
              key={idx} 
              className="p-3 rounded-xl bg-muted/30 border border-border/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{metric.icon}</span>
                <Badge className={`${metric.level.color} text-white text-[10px] px-1.5`}>
                  {metric.level.label}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-1">{metric.name}</div>
              <div className="text-xl font-bold">{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Advisory */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Snowflake className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Winter Advisory</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {snowData.snowfall > 2 
              ? '⚠️ Heavy snowfall expected. Travel not recommended.'
              : snowData.iceRisk > 50
              ? '⚠️ Icy conditions likely. Drive carefully.'
              : snowData.windChill < 0
              ? '🥶 Dangerous wind chill. Limit outdoor exposure.'
              : '✅ Winter conditions manageable.'}
          </p>
        </div>
      </div>
    </div>
  );
}
