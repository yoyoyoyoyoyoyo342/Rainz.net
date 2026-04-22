import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface FeedPrediction {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  predicted_condition: string;
  predicted_high: number;
  predicted_low: number;
  prediction_date: string;
  location_name: string;
  is_verified: boolean;
  is_correct: boolean | null;
  points_earned: number | null;
  created_at: string;
  score: number;
  is_followed: boolean;
}

export function SocialFeed({ isImperial }: { isImperial: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: feed = [], isLoading } = useQuery({
    queryKey: ["social-feed-ranked", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Followed user IDs (for boost)
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingSet = new Set((follows || []).map((f) => f.following_id));

      // Pull recent predictions pool (last 200)
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("id, user_id, predicted_condition, predicted_high, predicted_low, prediction_date, location_name, is_verified, is_correct, points_earned, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!predictions || predictions.length === 0) return [];

      const userIds = [...new Set(predictions.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const now = Date.now();
      const ranked = predictions
        .filter((p) => p.user_id !== user.id)
        .map((p) => {
          const prof = profileMap.get(p.user_id) as any;
          const isFollowed = followingSet.has(p.user_id);
          const hoursSincePost = (now - new Date(p.created_at).getTime()) / 3_600_000;
          const recencyBoost = Math.max(0, 100 - hoursSincePost * 2);
          const correctBoost = p.is_correct ? 30 : 0;
          const score = (isFollowed ? 50 : 0) + recencyBoost + correctBoost;
          return {
            ...p,
            display_name: prof?.display_name || "Unknown",
            avatar_url: prof?.avatar_url || null,
            is_followed: isFollowed,
            score,
          } as FeedPrediction;
        })
        .sort((a, b) => b.score - a.score);

      // Discovery slot: every 5 posts inject a non-followed post if available
      const followedSorted = ranked.filter((p) => p.is_followed);
      const discoverySorted = ranked.filter((p) => !p.is_followed);
      const blended: FeedPrediction[] = [];
      let fIdx = 0, dIdx = 0;
      while (blended.length < 50 && (fIdx < followedSorted.length || dIdx < discoverySorted.length)) {
        if (blended.length > 0 && blended.length % 5 === 0 && dIdx < discoverySorted.length) {
          blended.push(discoverySorted[dIdx++]);
        } else if (fIdx < followedSorted.length) {
          blended.push(followedSorted[fIdx++]);
        } else if (dIdx < discoverySorted.length) {
          blended.push(discoverySorted[dIdx++]);
        }
      }
      return blended;
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
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/profile/${item.user_id}`)}
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={item.avatar_url || undefined} alt={item.display_name} />
              <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                {item.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
