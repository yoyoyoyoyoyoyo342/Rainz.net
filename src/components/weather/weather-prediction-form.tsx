import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CloudRain, CloudSnow, Cloud, Sun, CloudDrizzle, CloudLightning, 
  CloudFog, Wind, Target, ThermometerSnowflake, 
  ThermometerSun, Sparkles, MapPin, Share2, Swords, Bot
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { usePredictionShare } from "@/contexts/prediction-share-context";
import { UserSearch } from "./user-search";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { weatherApi } from "@/lib/weather-api";

interface WeatherPredictionFormProps {
  location: string;
  latitude: number;
  longitude: number;
  onPredictionMade: (predictionId?: string) => void;
  isImperial: boolean;
  returnPredictionId?: boolean;
}

const weatherConditions = [
  { value: "sunny", label: "Sunny", icon: Sun, color: "text-yellow-500" },
  { value: "partly-cloudy", label: "Partly Cloudy", icon: Cloud, color: "text-blue-300" },
  { value: "cloudy", label: "Cloudy", icon: Cloud, color: "text-gray-400" },
  { value: "overcast", label: "Overcast", icon: Cloud, color: "text-gray-500" },
  { value: "drizzle", label: "Drizzle", icon: CloudDrizzle, color: "text-blue-400" },
  { value: "rainy", label: "Rainy", icon: CloudRain, color: "text-blue-500" },
  { value: "heavy-rain", label: "Heavy Rain", icon: CloudRain, color: "text-blue-600" },
  { value: "thunderstorm", label: "Thunderstorm", icon: CloudLightning, color: "text-purple-500" },
  { value: "snowy", label: "Snowy", icon: CloudSnow, color: "text-sky-300" },
  { value: "heavy-snow", label: "Heavy Snow", icon: CloudSnow, color: "text-sky-400" },
  { value: "sleet", label: "Sleet/Mix", icon: CloudSnow, color: "text-slate-400" },
  { value: "foggy", label: "Foggy", icon: CloudFog, color: "text-gray-400" },
  { value: "windy", label: "Windy", icon: Wind, color: "text-teal-500" },
];

const predictionSchema = z.object({
  predictedHigh: z.number()
    .min(-100, "Temperature must be at least -100°")
    .max(150, "Temperature must be at most 150°"),
  predictedLow: z.number()
    .min(-100, "Temperature must be at least -100°")
    .max(150, "Temperature must be at most 150°"),
  predictedCondition: z.string().min(1, "Please select a weather condition"),
}).refine(data => data.predictedHigh >= data.predictedLow, {
  message: "High must be ≥ low temperature",
  path: ["predictedHigh"],
});

// Read-only card showing what Rainz (LLM) predicts for tomorrow
function RainzPredictionCard({ latitude, longitude, isImperial }: { latitude: number; longitude: number; isImperial: boolean }) {
  const [prediction, setPrediction] = useState<{ high: number; low: number; condition: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await weatherApi.getWeatherData(latitude, longitude, "");
        const daily = data?.mostAccurate?.dailyForecast;
        if (daily && daily.length >= 2 && !cancelled) {
          const tomorrow = daily[1];
          // Data from API is in Fahrenheit — convert to Celsius for display unless imperial
          const highC = Math.round(((tomorrow.highTemp - 32) * 5) / 9);
          const lowC = Math.round(((tomorrow.lowTemp - 32) * 5) / 9);
          setPrediction({
            high: isImperial ? tomorrow.highTemp : highC,
            low: isImperial ? tomorrow.lowTemp : lowC,
            condition: tomorrow.condition || tomorrow.description || "—",
          });
        }
      } catch {
        // silently fail
      }
    })();
    return () => { cancelled = true; };
  }, [latitude, longitude, isImperial]);

  if (!prediction) return null;

  const matchedCondition = weatherConditions.find(c =>
    prediction.condition.toLowerCase().includes(c.value.replace("-", " ")) ||
    prediction.condition.toLowerCase().includes(c.label.toLowerCase())
  );
  const CondIcon = matchedCondition?.icon || Cloud;
  const condColor = matchedCondition?.color || "text-muted-foreground";

  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-primary/10 border border-sky-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Rainz Prediction</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CondIcon className={`w-6 h-6 ${condColor}`} />
          <span className="text-sm font-medium">{prediction.condition}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-blue-400 font-semibold">{prediction.low}°</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-orange-400 font-semibold">{prediction.high}°</span>
        </div>
      </div>
    </div>
  );
}

export const WeatherPredictionForm = ({ 
  location, 
  latitude, 
  longitude,
  onPredictionMade,
  isImperial,
  returnPredictionId = false
}: WeatherPredictionFormProps) => {
  const { user } = useAuth();
  const { createBattle } = usePredictionBattles();
   const { openShareDialog } = usePredictionShare();
  const [predictedHigh, setPredictedHigh] = useState("");
  const [predictedLow, setPredictedLow] = useState("");
  const [predictedCondition, setPredictedCondition] = useState("");
  const [loading, setLoading] = useState(false);
  const [enableBattle, setEnableBattle] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to make predictions");
      return;
    }
    
    if (!predictedHigh || !predictedLow || !predictedCondition) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      predictionSchema.parse({
        predictedHigh: parseFloat(predictedHigh),
        predictedLow: parseFloat(predictedLow),
        predictedCondition,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      const predictionDate = tomorrow.toISOString().split("T")[0];

      const { data: existingPrediction } = await supabase
        .from("weather_predictions")
        .select("id")
        .eq("user_id", user.id)
        .eq("prediction_date", predictionDate)
        .maybeSingle();

      if (existingPrediction) {
        toast.error("You've already predicted for tomorrow!");
        setLoading(false);
        return;
      }

      // Check for active power-ups and use them
      let hasDoublePoints = false;
      let hasPredictionShield = false;
      
      const { data: powerups } = await supabase
        .from("active_powerups")
        .select("id, powerup_type, uses_remaining")
        .eq("user_id", user.id);
      
      for (const powerup of powerups || []) {
        if (powerup.powerup_type === "double_points" && (powerup.uses_remaining || 0) > 0) {
          hasDoublePoints = true;
          // Consume the power-up
          if (powerup.uses_remaining === 1) {
            await supabase.from("active_powerups").delete().eq("id", powerup.id);
          } else {
            await supabase.from("active_powerups").update({ uses_remaining: (powerup.uses_remaining || 1) - 1 }).eq("id", powerup.id);
          }
          toast.success("⚡ Double Points activated! 2x points on this prediction!");
        }
        if (powerup.powerup_type === "prediction_boost" && (powerup.uses_remaining || 0) > 0) {
          hasPredictionShield = true;
          // Consume one use of the shield
          if (powerup.uses_remaining === 1) {
            await supabase.from("active_powerups").delete().eq("id", powerup.id);
          } else {
            await supabase.from("active_powerups").update({ uses_remaining: (powerup.uses_remaining || 1) - 1 }).eq("id", powerup.id);
          }
          toast.success("🛡️ Prediction Shield activated! Protected from point loss!");
        }
      }

      // Build powerup flags object to store with prediction
      const powerupFlags: Record<string, boolean> = {};
      if (hasDoublePoints) powerupFlags.double_points = true;
      if (hasPredictionShield) powerupFlags.prediction_shield = true;

      // IMPORTANT: predictions are stored in CELSIUS for fair verification against Open-Meteo (Celsius).
      const predictedHighValue = parseFloat(predictedHigh);
      const predictedLowValue = parseFloat(predictedLow);
      const predictedHighC = isImperial ? Math.round(((predictedHighValue - 32) * 5) / 9) : predictedHighValue;
      const predictedLowC = isImperial ? Math.round(((predictedLowValue - 32) * 5) / 9) : predictedLowValue;

      const { data, error } = await supabase
        .from("weather_predictions")
        .insert({
          user_id: user.id,
          prediction_date: predictionDate,
          predicted_high: predictedHighC,
          predicted_low: predictedLowC,
          predicted_condition: predictedCondition,
          location_name: location,
          latitude,
          longitude,
          powerup_flags: powerupFlags,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create battle if enabled
      if (enableBattle && data?.id) {
        await createBattle(
          location,
          latitude,
          longitude,
          predictionDate,
          data.id,
          selectedOpponent?.id
        );
        toast.success(selectedOpponent 
          ? `🎯 Prediction submitted & challenged ${selectedOpponent.name}!`
          : "🎯 Prediction submitted & open battle created!"
        );
      } else {
        toast.success("🎯 Prediction submitted!");
      }
      
      // Store prediction for sharing BEFORE clearing form
      const conditionLabel = weatherConditions.find(c => c.value === predictedCondition)?.label || predictedCondition;
      const predictionForShare = {
        high: predictedHigh,
        low: predictedLow,
        condition: conditionLabel,
        location,
      };
      
      // Clear form
      setPredictedHigh("");
      setPredictedLow("");
      setPredictedCondition("");
      setEnableBattle(false);
      setSelectedOpponent(null);
      
      // Only show share dialog if NOT in battle acceptance mode
      if (!returnPredictionId) {
         // Use global context to show share dialog - this persists even after dialog closes
         openShareDialog(predictionForShare);
      }
      
      // Call callback - immediately for battle acceptance, delayed for normal submission
      const predictionId = data?.id;
      if (returnPredictionId) {
        // For battle acceptance, call immediately with the prediction ID
        onPredictionMade(predictionId);
      } else {
        setTimeout(() => {
          onPredictionMade();
        }, 100);
      }
    } catch (error: any) {
      toast.error("Failed to submit prediction");
      console.error("Error submitting prediction:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCondition = weatherConditions.find(c => c.value === predictedCondition);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">Predict Tomorrow's Weather</h3>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        <p className="text-xs text-muted-foreground">{tomorrowFormatted}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Temperature Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <ThermometerSnowflake className="w-4 h-4 text-blue-400" />
              Low Temp
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={predictedLow}
                onChange={(e) => setPredictedLow(e.target.value)}
                placeholder={isImperial ? "55" : "13"}
                className="text-lg font-semibold pr-10 h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                °{isImperial ? 'F' : 'C'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <ThermometerSun className="w-4 h-4 text-orange-400" />
              High Temp
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={predictedHigh}
                onChange={(e) => setPredictedHigh(e.target.value)}
                placeholder={isImperial ? "75" : "24"}
                className="text-lg font-semibold pr-10 h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                °{isImperial ? 'F' : 'C'}
              </span>
            </div>
          </div>
        </div>

        {/* Condition Select */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Cloud className="w-4 h-4" />
            Weather Condition
          </Label>
          <Select value={predictedCondition} onValueChange={setPredictedCondition}>
            <SelectTrigger className="h-12">
              {selectedCondition ? (
                <div className="flex items-center gap-3">
                  <selectedCondition.icon className={`w-5 h-5 ${selectedCondition.color}`} />
                  <span className="font-medium">{selectedCondition.label}</span>
                </div>
              ) : (
                <SelectValue placeholder="Select condition..." />
              )}
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-2 gap-1 p-1">
                {weatherConditions.map((condition) => {
                  const Icon = condition.icon;
                  return (
                    <SelectItem 
                      key={condition.value} 
                      value={condition.value} 
                      className="cursor-pointer rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${condition.color}`} />
                        <span>{condition.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        {(predictedHigh || predictedLow || predictedCondition) && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-2">Your Prediction</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedCondition && (
                  <selectedCondition.icon className={`w-8 h-8 ${selectedCondition.color}`} />
                )}
                <span className="font-medium">{selectedCondition?.label || "—"}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">{predictedLow || "—"}°</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-orange-400 font-semibold">{predictedHigh || "—"}°</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rainz Prediction Card */}
        <RainzPredictionCard latitude={latitude} longitude={longitude} isImperial={isImperial} />

        {/* Battle Challenge Section */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-purple-500" />
              <Label htmlFor="enable-battle" className="text-sm font-medium cursor-pointer">
                Create a Battle
              </Label>
            </div>
            <Switch
              id="enable-battle"
              checked={enableBattle}
              onCheckedChange={setEnableBattle}
            />
          </div>
          
          {enableBattle && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Challenge someone or create an open battle for anyone to join. Winner gets bonus points!
              </p>
              <UserSearch
                onSelectUser={(userId, displayName) => setSelectedOpponent({ id: userId, name: displayName })}
                selectedUser={selectedOpponent}
                onClearSelection={() => setSelectedOpponent(null)}
              />
              {!selectedOpponent && (
                <p className="text-xs text-center text-muted-foreground">
                  Or leave empty for an open challenge anyone can accept
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold gap-2" 
          disabled={loading || !predictedHigh || !predictedLow || !predictedCondition}
        >
          {loading ? (
            <>Submitting...</>
          ) : enableBattle ? (
            <>
              <Swords className="w-5 h-5" />
              {selectedOpponent ? `Challenge ${selectedOpponent.name}` : "Submit & Create Open Battle"}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Submit Prediction
            </>
          )}
        </Button>

        {/* Scoring Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-2">
          <p>🎯 All 3 correct = <span className="text-green-500 font-medium">+300 pts + Free Streak Freeze!</span></p>
          <p>Predictions verified at 10 PM CET daily</p>
        </div>
      </form>
    </div>
  );
};
