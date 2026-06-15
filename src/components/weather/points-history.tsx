import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Swords, TrendingUp, TrendingDown, Sparkles, Flame, Trophy, ListChecks } from "lucide-react";
import { PredictHero } from "@/components/predict/predict-hero";
import { PillChips } from "@/components/predict/pill-chips";
import { StatPill } from "@/components/predict/stat-pill";
import { GlassRow } from "@/components/predict/glass-row";

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

type Filter = "all" | "predictions" | "battles" | "wins" | "losses";

export function PointsHistory() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: events, isLoading } = useQuery<HistoryEvent[]>({
    queryKey: ["points-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("id, prediction_date, location_name, points_earned, confidence_multiplier, is_correct, is_verified")
        .eq("user_id", user.id)
        .eq("is_verified", true)
        .order("prediction_date", { ascending: false })
        .limit(50);

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

      const opponentIds = new Set<string>();
      (battles || []).forEach(b => {
        const oppId = b.challenger_id === user.id ? b.opponent_id : b.challenger_id;
        if (oppId) opponentIds.add(oppId);
      });
      const nameMap: Record<string, string> = {};
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

  const stats = useMemo(() => {
    const e = events || [];
    const total = e.reduce((s, x) => s + (x.points || 0), 0);
    const wins = e.filter(x => x.type === "prediction" ? x.isCorrect : x.isWin).length;
    const losses = e.filter(x => x.type === "prediction" ? x.isCorrect === false : x.isWin === false).length;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    return { total, wins, losses, winRate, count: e.length };
  }, [events]);

  const filtered = useMemo(() => {
    const e = events || [];
    switch (filter) {
      case "predictions": return e.filter(x => x.type === "prediction");
      case "battles": return e.filter(x => x.type === "battle");
      case "wins": return e.filter(x => x.type === "prediction" ? x.isCorrect : x.isWin);
      case "losses": return e.filter(x => x.type === "prediction" ? x.isCorrect === false : x.isWin === false);
      default: return e;
    }
  }, [events, filter]);

  return (
    <div className="space-y-4">
      <PredictHero
        eyebrow="Your Journey"
        eyebrowIcon={Sparkles}
        title={`${stats.total.toLocaleString()} pts`}
        subtitle={`${stats.count} events tracked • ${stats.wins} wins / ${stats.losses} losses`}
        gradient="violet"
        pills={
          <>
            <StatPill icon={Trophy} value={`${stats.winRate}%`} tone="green" />
            <StatPill icon={Flame} value={stats.wins} tone="orange" />
          </>
        }
        footer={
          <PillChips
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: "all", label: "All", icon: ListChecks, count: stats.count },
              { value: "predictions", label: "Predicts", icon: Target },
              { value: "battles", label: "Battles", icon: Swords },
              { value: "wins", label: "Wins", icon: TrendingUp },
              { value: "losses", label: "Losses", icon: TrendingDown },
            ]}
          />
        }
      />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-background/50">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No events match this filter yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(event => {
            const positive = event.points > 0;
            const accent = event.type === "battle"
              ? (event.isWin ? "green" : "red")
              : (event.isCorrect ? "green" : event.isCorrect === false ? "red" : "amber");
            return (
              <GlassRow key={event.id} accent={accent as any}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  event.type === "battle" ? "bg-rose-500/10" : positive ? "bg-green-500/10" : event.points < 0 ? "bg-red-500/10" : "bg-muted"
                }`}>
                  {event.type === "battle" ? <Swords className="w-4 h-4 text-rose-500" /> :
                    positive ? <TrendingUp className="w-4 h-4 text-green-500" /> :
                    event.points < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> :
                    <Target className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {event.type === "battle" ? `Battle vs ${event.opponentName}` : event.location}
                    </span>
                    {event.confidence && event.confidence > 1 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">{event.confidence}x</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {event.type === "battle" && (event.isWin ? " • Won" : " • Lost")}
                  </p>
                </div>
                <span className={`text-base font-bold shrink-0 ${positive ? "text-green-500" : event.points < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {positive ? "+" : ""}{event.points}
                </span>
              </GlassRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
