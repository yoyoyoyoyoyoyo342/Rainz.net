import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommunityAccuracyBadgeProps {
  locationName: string;
  latitude: number;
  longitude: number;
}

interface CommunityStats {
  accuracy: number;
  predictorCount: number;
  totalPredictions: number;
}

export function CommunityAccuracyBadge({ locationName, latitude, longitude }: CommunityAccuracyBadgeProps) {
  const { data: stats } = useQuery<CommunityStats | null>({
    queryKey: ["community-accuracy", latitude, longitude],
    queryFn: async () => {
      // Find verified predictions within ~50km (approx 0.5 degree)
      const latRange = 0.5;
      const lonRange = 0.5;

      const { data, error } = await supabase
        .from("weather_predictions")
        .select("user_id, is_correct, is_verified")
        .gte("latitude", latitude - latRange)
        .lte("latitude", latitude + latRange)
        .gte("longitude", longitude - lonRange)
        .lte("longitude", longitude + lonRange)
        .eq("is_verified", true);

      if (error || !data || data.length === 0) return null;

      const correct = data.filter(p => p.is_correct).length;
      const accuracy = Math.round((correct / data.length) * 100);
      const uniqueUsers = new Set(data.map(p => p.user_id)).size;

      return {
        accuracy,
        predictorCount: uniqueUsers,
        totalPredictions: data.length,
      };
    },
    staleTime: 1000 * 60 * 15, // 15 min cache
  });

  if (!stats || stats.totalPredictions < 3) return null;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return "text-emerald-400";
    if (acc >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getConfidenceLevel = (count: number) => {
    if (count >= 20) return { label: "High confidence", icon: "🔥" };
    if (count >= 10) return { label: "Growing", icon: "📈" };
    return { label: "Early data", icon: "🌱" };
  };

  const confidence = getConfidenceLevel(stats.predictorCount);
  const cityName = locationName.split(",")[0].trim();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 bg-muted/60 border-border/40">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-medium">
          {cityName} community:
        </span>
        <span className={`text-xs font-bold ${getAccuracyColor(stats.accuracy)}`}>
          {stats.accuracy}% accurate
        </span>
        <span className="text-xs text-muted-foreground">
          ({stats.predictorCount} predictor{stats.predictorCount !== 1 ? "s" : ""})
        </span>
      </Badge>
      <span className="text-xs text-muted-foreground">{confidence.icon} {confidence.label}</span>
    </div>
  );
}
