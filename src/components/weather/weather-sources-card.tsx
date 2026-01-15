import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, AlertCircle, Users, Satellite } from "lucide-react";
import { WeatherSource } from "@/types/weather";

interface WeatherSourcesCardProps {
  sources: WeatherSource[];
}

export function WeatherSourcesCard({ sources }: WeatherSourcesCardProps) {
  if (!sources || sources.length === 0) return null;

  // Separate community sources from model sources for display
  const communitySources = sources.filter(s => s.source.includes('Community'));
  const modelSources = sources.filter(s => !s.source.includes('Community'));

  // Calculate model agreement (how similar are the temperatures) - only for model sources with temps
  const tempsWithData = modelSources.filter(s => s.currentWeather.temperature !== 0);
  const temps = tempsWithData.map(s => s.currentWeather.temperature);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  const maxDeviation = temps.length > 0 ? Math.max(...temps.map(t => Math.abs(t - avgTemp))) : 0;
  const agreement = Math.max(0, 100 - (maxDeviation * 10)); // 1°F deviation = 10% reduction

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.92) return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    if (accuracy >= 0.88) return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700";
    return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700";
  };

  const getSourceIcon = (sourceName: string) => {
    if (sourceName.includes('Community')) return <Users className="w-4 h-4 text-green-500" />;
    return <Satellite className="w-4 h-4 text-blue-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Sources
          </CardTitle>
          <Badge variant="outline" className={agreement > 80 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"}>
            {agreement > 80 ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
            {Math.round(agreement)}% Agreement
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Community Reports Section */}
        {communitySources.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Community Reports
            </h4>
            <div className="space-y-2">
              {communitySources.map((source, idx) => (
                <div key={`community-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceIcon(source.source)}
                      <span className="font-medium text-sm">{source.source}</span>
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                        {Math.round(source.accuracy * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {source.currentWeather.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{source.currentWeather.condition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weather Models Section */}
        <div>
          {communitySources.length > 0 && (
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Satellite className="w-3 h-3" />
              Weather Models
            </h4>
          )}
          <div className="space-y-2">
            {modelSources.slice(0, 5).map((source, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{source.source}</span>
                    <Badge variant="outline" className={`text-xs ${getAccuracyColor(source.accuracy)}`}>
                      {Math.round(source.accuracy * 100)}% accurate
                    </Badge>
                  </div>
                  {source.stationInfo && (
                    <p className="text-xs text-muted-foreground">
                      {source.stationInfo.name}, {source.stationInfo.region}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{source.currentWeather.temperature}°F</p>
                  <p className="text-xs text-muted-foreground">{source.currentWeather.condition}</p>
                </div>
              </div>
            ))}
            {modelSources.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{modelSources.length - 5} more models
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Rainz combines forecasts from multiple weather models (ECMWF, GFS, DWD ICON) and community reports to provide more accurate predictions.
            {communitySources.length > 0 && " Community reports from users in your area are weighted into the forecast."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
