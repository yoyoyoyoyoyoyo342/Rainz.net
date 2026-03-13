import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface FeedPrediction {
  id: string;
  user_id: string;
  display_name: string;
  predicted_condition: string;
  predicted_high: number;
  predicted_low: number;
  prediction_date: string;
  location_name: string;
  is_verified: boolean;
  is_correct: boolean | null;
  points_earned: number | null;
  created_at: string;
}

export function SocialFeed({ isImperial }: { isImperial: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: feed = [], isLoading } = useQuery({
    queryKey: ["social-feed", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get followed user IDs
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) return [];

      const followingIds = follows.map((f) => f.following_id);

      // Get recent predictions from followed users
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("id, user_id, predicted_condition, predicted_high, predicted_low, prediction_date, location_name, is_verified, is_correct, points_earned, created_at")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!predictions || predictions.length === 0) return [];

      // Get display names
      const userIds = [...new Set(predictions.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);

      return predictions.map((p) => ({
        ...p,
        display_name: nameMap.get(p.user_id) || "Unknown",
      })) as FeedPrediction[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  if (!user) return null;

  const conditionEmoji: Record<string, string> = {
    sunny: "☀️", clear: "☀️", "partly-cloudy": "⛅", cloudy: "☁️",
    rainy: "🌧️", snowy: "❄️", stormy: "⛈️", thunderstorm: "⛈️",
    foggy: "🌫️", windy: "💨", drizzle: "🌦️",
  };

  if (isLoading) {
    return (
      <Card className="glass-card border border-border/20 rounded-2xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Friends Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (feed.length === 0) return null;

  return (
    <Card className="glass-card border border-border/20 rounded-2xl mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Friends Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {feed.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/profile/${item.user_id}`)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{item.display_name}</span>
                {item.is_verified && (
                  item.is_correct ? (
                    <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  )
                )}
                {!item.is_verified && <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {conditionEmoji[item.predicted_condition] || "🌡️"} {item.predicted_high}°/{item.predicted_low}° · {item.location_name}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-xs text-muted-foreground">
                {new Date(item.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              {item.points_earned != null && item.points_earned > 0 && (
                <Badge variant="secondary" className="text-xs">+{item.points_earned}</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
