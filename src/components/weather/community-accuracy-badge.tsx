import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
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
  verifiedCount: number;
}

export function CommunityAccuracyBadge({ locationName, latitude, longitude }: CommunityAccuracyBadgeProps) {
  const { data: stats, isLoading } = useQuery<CommunityStats | null>({
    queryKey: ["community-accuracy", Math.round(latitude * 10) / 10, Math.round(longitude * 10) / 10],
    queryFn: async () => {
      // ~50km radius (0.5 degree)
      const latRange = 0.5;
      const lonRange = 0.5;

      // Fetch all predictions in range (not just verified) to show community size
      const { data, error } = await supabase
        .from("weather_predictions")
        .select("user_id, is_correct, is_verified")
        .gte("latitude", latitude - latRange)
        .lte("latitude", latitude + latRange)
        .gte("longitude", longitude - lonRange)
        .lte("longitude", longitude + lonRange);

      if (error || !data || data.length === 0) return null;

      const verified = data.filter(p => p.is_verified);
      const correct = verified.filter(p => p.is_correct).length;
      const accuracy = verified.length > 0 ? Math.round((correct / verified.length) * 100) : 0;
      const uniqueUsers = new Set(data.map(p => p.user_id)).size;

      return {
        accuracy,
        predictorCount: uniqueUsers,
        totalPredictions: data.length,
        verifiedCount: verified.length,
      };
    },
    staleTime: 1000 * 60 * 15, // 15 min cache
  });

  if (isLoading || !stats) return null;

  const cityName = locationName.split(",")[0].trim();

  // No predictions in area at all — show a "be first" prompt
  if (stats.totalPredictions === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 bg-muted/60 border-border/40">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            No predictions for {cityName} yet — be the first! 🌱
          </span>
        </Badge>
      </div>
    );
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return "text-emerald-400";
    if (acc >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getConfidenceLevel = (verified: number) => {
    if (verified >= 20) return { label: "High confidence", icon: "🔥" };
    if (verified >= 5) return { label: "Growing", icon: "📈" };
    if (verified > 0) return { label: "Early data", icon: "🌱" };
    return { label: "Unverified", icon: "⏳" };
  };

  const confidence = getConfidenceLevel(stats.verifiedCount);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 bg-muted/60 border-border/40">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-medium">
          {cityName}:
        </span>
        {stats.verifiedCount > 0 ? (
          <span className={`text-xs font-bold ${getAccuracyColor(stats.accuracy)}`}>
            {stats.accuracy}% accurate
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">predictions pending verification</span>
        )}
        <span className="text-xs text-muted-foreground">
          · {stats.predictorCount} predictor{stats.predictorCount !== 1 ? "s" : ""}
        </span>
      </Badge>
      <span className="text-xs text-muted-foreground">{confidence.icon} {confidence.label}</span>
    </div>
  );
}
