import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays } from "date-fns";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useRef } from "react";

interface WeatherTimeMachineProps {
  latitude: number;
  longitude: number;
  locationName: string;
  isImperial: boolean;
}

interface HistoricalWeather {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

const weatherCodeToCondition = (code: number): string => {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

const weatherCodeToEmoji = (code: number): string => {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⛈️";
  return "🌡️";
};

export function WeatherTimeMachine({ latitude, longitude, locationName, isImperial }: WeatherTimeMachineProps) {
  const { user } = useAuth();
  const [daysAgo, setDaysAgo] = useState(7);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const selectedDate = subDays(new Date(), daysAgo);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch historical weather from Open-Meteo Archive API
  const { data: historicalWeather, isLoading } = useQuery({
    queryKey: ["historical-weather", latitude, longitude, dateStr],
    queryFn: async (): Promise<HistoricalWeather> => {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code&temperature_unit=${isImperial ? "fahrenheit" : "celsius"}&wind_speed_unit=${isImperial ? "mph" : "kmh"}&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch historical weather");
      const data = await res.json();

      return {
        date: dateStr,
        temperatureMax: Math.round(data.daily.temperature_2m_max[0]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[0]),
        temperatureMean: Math.round(data.daily.temperature_2m_mean[0]),
        precipitation: data.daily.precipitation_sum[0] || 0,
        windSpeed: Math.round(data.daily.wind_speed_10m_max[0]),
        weatherCode: data.daily.weather_code[0] || 0,
      };
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch user's prediction for that date if they had one
  const { data: userPrediction } = useQuery({
    queryKey: ["prediction-for-date", user?.id, dateStr, latitude, longitude],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("weather_predictions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("prediction_date", dateStr)
        .gte("latitude", latitude - 0.1)
        .lte("latitude", latitude + 0.1)
        .gte("longitude", longitude - 0.1)
        .lte("longitude", longitude + 0.1)
        .maybeSingle();
      return data;
    },
  });

  const calculateAccuracy = () => {
    if (!userPrediction || !historicalWeather) return null;
    const tempDiff = Math.abs(userPrediction.predicted_high - historicalWeather.temperatureMax);
    const maxDiff = 10; // 10 degrees = 0% accuracy
    const accuracy = Math.max(0, Math.round((1 - tempDiff / maxDiff) * 100));
    return accuracy;
  };

  const accuracy = calculateAccuracy();
  const unit = isImperial ? "°F" : "°C";

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    try {
      const dataUrl = await toPng(shareCardRef.current, { backgroundColor: "#1a1a2e" });
      const link = document.createElement("a");
      link.download = `rainz-time-machine-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Share card downloaded!");
    } catch {
      toast.error("Failed to create share card");
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Weather Time Machine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setDaysAgo(Math.min(365, daysAgo + 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {format(selectedDate, "MMMM d, yyyy")}
              {daysAgo === 1 && <span className="text-muted-foreground">(Yesterday)</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDaysAgo(Math.max(1, daysAgo - 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Slider
            value={[daysAgo]}
            onValueChange={(v) => setDaysAgo(v[0])}
            min={1}
            max={365}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Yesterday</span>
            <span>1 year ago</span>
          </div>
        </div>

        {/* Historical data display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : historicalWeather ? (
          <div ref={shareCardRef} className="rounded-xl p-4 bg-gradient-to-br from-primary/10 to-accent/10 border border-border/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{weatherCodeToEmoji(historicalWeather.weatherCode)}</span>
                <div>
                  <p className="text-sm font-medium">{weatherCodeToCondition(historicalWeather.weatherCode)}</p>
                  <p className="text-xs text-muted-foreground">{locationName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{historicalWeather.temperatureMax}{unit}</p>
                <p className="text-xs text-muted-foreground">Low: {historicalWeather.temperatureMin}{unit}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Avg</p>
                <p className="text-sm font-medium">{historicalWeather.temperatureMean}{unit}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Rain</p>
                <p className="text-sm font-medium">{historicalWeather.precipitation}mm</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Wind</p>
                <p className="text-sm font-medium">{historicalWeather.windSpeed} {isImperial ? "mph" : "km/h"}</p>
              </div>
            </div>

            {/* User prediction overlay */}
            {userPrediction && (
              <div className="border-t border-border/30 pt-3 space-y-2">
                <p className="text-xs font-medium text-primary">🎯 Your Prediction That Day</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">You predicted: </span>
                    <span className="font-medium">{userPrediction.predicted_high}{unit}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-medium">{userPrediction.predicted_low}{unit}</span>
                    <span className="text-muted-foreground"> — {userPrediction.predicted_condition}</span>
                  </div>
                </div>
                {accuracy !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-primary">{accuracy}%</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Rainz Weather Time Machine • {format(selectedDate, "MMM d, yyyy")}
            </p>
          </div>
        ) : null}

        {/* Share button */}
        {historicalWeather && (
          <Button variant="outline" size="sm" onClick={handleShare} className="w-full gap-2">
            <Share2 className="w-4 h-4" />
            Share This Day
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
