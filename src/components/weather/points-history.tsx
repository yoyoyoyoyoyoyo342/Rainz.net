import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Swords, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HistoryEvent {
  id: string;
  date: string;
  type: "prediction" | "battle";
  location: string;
  points: number;
  confidence?: number;
  isCorrect?: boolean | null;
  opponentName?: string;
  isWin?: boolean;
}

export function PointsHistory() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery<HistoryEvent[]>({
    queryKey: ["points-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Fetch verified predictions
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("id, prediction_date, location_name, points_earned, confidence_multiplier, is_correct, is_verified")
        .eq("user_id", user.id)
        .eq("is_verified", true)
        .order("prediction_date", { ascending: false })
        .limit(50);

      // Fetch completed battles
      const { data: battles } = await supabase
        .from("prediction_battles")
        .select("id, battle_date, location_name, bonus_points, winner_id, challenger_id, opponent_id, status")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq("status", "completed")
        .order("battle_date", { ascending: false })
        .limit(50);

      const items: HistoryEvent[] = [];

      (predictions || []).forEach(p => {
        items.push({
          id: p.id,
          date: p.prediction_date,
          type: "prediction",
          location: p.location_name,
          points: p.points_earned || 0,
          confidence: p.confidence_multiplier,
          isCorrect: p.is_correct,
        });
      });

      // Get opponent names for battles
      const opponentIds = new Set<string>();
      (battles || []).forEach(b => {
        const oppId = b.challenger_id === user.id ? b.opponent_id : b.challenger_id;
        if (oppId) opponentIds.add(oppId);
      });

      let nameMap: Record<string, string> = {};
      if (opponentIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", Array.from(opponentIds));
        (profiles || []).forEach(p => { nameMap[p.user_id] = p.display_name || "Unknown"; });
      }

      (battles || []).forEach(b => {
        const isWin = b.winner_id === user.id;
        const oppId = b.challenger_id === user.id ? b.opponent_id : b.challenger_id;
        items.push({
          id: b.id,
          date: b.battle_date,
          type: "battle",
          location: b.location_name,
          points: isWin ? (b.bonus_points || 50) : 0,
          opponentName: oppId ? nameMap[oppId] || "Unknown" : "Open",
          isWin,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items.slice(0, 50);
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card className="bg-background/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No points history yet. Make predictions to start earning!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {events.map(event => (
        <Card key={event.id} className="bg-background/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              event.type === "battle" ? "bg-rose-500/10" : event.points > 0 ? "bg-green-500/10" : event.points < 0 ? "bg-red-500/10" : "bg-muted"
            }`}>
              {event.type === "battle" ? (
                <Swords className="w-4 h-4 text-rose-500" />
              ) : event.points > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : event.points < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {event.type === "battle" ? `Battle vs ${event.opponentName}` : event.location}
                </span>
                {event.confidence && event.confidence > 1 && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">{event.confidence}x</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {event.type === "battle" && (event.isWin ? " • Won" : " • Lost")}
              </p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${event.points > 0 ? "text-green-500" : event.points < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {event.points > 0 ? "+" : ""}{event.points}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
