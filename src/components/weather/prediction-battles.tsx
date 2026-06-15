import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Swords, Trophy, Clock, CheckCircle, XCircle, Users,
  Timer, Share2, Inbox, Flame, Crown
} from "lucide-react";
import { toast } from "sonner";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AppOnlyGate } from "./app-only-gate";
import { subdomainHref } from "@/lib/subdomain-routing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PredictHero } from "@/components/predict/predict-hero";
import { PillChips } from "@/components/predict/pill-chips";
import { StatPill } from "@/components/predict/stat-pill";
import { GlassRow } from "@/components/predict/glass-row";

interface PredictionBattlesProps {
  location: string;
  latitude: number;
  longitude: number;
  onAcceptBattle?: (battleId: string) => void;
}

const getTimeUntilExpiry = (createdAt: string) => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  const hoursLeft = differenceInHours(midnight, now);
  const minutesLeft = differenceInMinutes(midnight, now) % 60;
  if (hoursLeft > 0) return `${hoursLeft}h ${minutesLeft}m`;
  if (minutesLeft > 0) return `${minutesLeft}m`;
  return "< 1m";
};

type BattleTab = "open" | "incoming" | "history";

export const PredictionBattles = (props: PredictionBattlesProps) => (
  <AppOnlyGate featureName="Prediction Battles">
    <PredictionBattlesInner {...props} />
  </AppOnlyGate>
);

const PredictionBattlesInner = ({
  location, latitude, longitude, onAcceptBattle,
}: PredictionBattlesProps) => {
  const { user } = useAuth();
  const { battles, pendingChallenges, loading, declineBattle, getOpenBattles } =
    usePredictionBattles();
  const [openBattles, setOpenBattles] = useState<any[]>([]);
  const [loadingOpen, setLoadingOpen] = useState(true);
  const [tab, setTab] = useState<BattleTab>("open");
  const [, forceUpdate] = useState(0);

  const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  const refetchOpen = async () => {
    setLoadingOpen(true);
    const open = await getOpenBattles(location, tomorrow);
    setOpenBattles(open);
    setLoadingOpen(false);
  };

  useEffect(() => {
    refetchOpen();
  }, [location]);

  // Realtime: refresh open battles list when any new battle is created/changed in this location
  useEffect(() => {
    const channel = supabase
      .channel(`open-battles-${location}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prediction_battles" },
        () => { refetchOpen(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [location]);

  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const completed = battles.filter((b: any) => b.status === "completed");
    const wins = completed.filter((b: any) => b.winner_id === user?.id).length;
    const losses = completed.length - wins;
    const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
    return { wins, losses, winRate, total: completed.length };
  }, [battles, user]);

  const activeCount = battles.filter((b: any) => b.status === "accepted").length;
  const history = battles.filter((b: any) => b.status === "completed").slice(0, 10);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  const isEmpty =
    openBattles.length === 0 &&
    pendingChallenges.length === 0 &&
    history.length === 0;

  return (
    <div className="space-y-4">
      <PredictHero
        eyebrow="Battle Arena"
        eyebrowIcon={Swords}
        title={activeCount > 0 ? `${activeCount} Active Battle${activeCount === 1 ? "" : "s"}` : "Ready to Battle"}
        subtitle={`${location} • Head-to-head weather predictions`}
        gradient="rose"
        pills={
          <>
            <StatPill icon={Crown} value={`${stats.winRate}%`} tone="green" />
            <StatPill icon={Flame} value={stats.wins} tone="orange" />
          </>
        }
        footer={
          <PillChips
            value={tab}
            onChange={setTab}
            options={[
              { value: "open", label: "Open", icon: Users, count: openBattles.length },
              { value: "incoming", label: "Incoming", icon: Inbox, count: pendingChallenges.length },
              { value: "history", label: "History", icon: Trophy, count: stats.total },
            ]}
          />
        }
      />

      {tab === "open" && (
        loadingOpen ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : openBattles.length === 0 ? (
          <EmptyState icon={Users} text={`No open challenges for ${location} yet.`} hint="Create one from the prediction form to start a battle." />
        ) : (
          <div className="space-y-2">
            {openBattles.map((battle: any) => (
              <GlassRow key={battle.id} accent="primary">
                <VsAvatars left={battle.challenger_name} right="?" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{battle.challenger_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {format(new Date(battle.battle_date), "MMM d")} • +{battle.bonus_points} pts to winner
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    <Timer className="w-3 h-3" />
                    {getTimeUntilExpiry(battle.created_at)} left
                  </span>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => onAcceptBattle?.(battle.id)}>
                  <Swords className="w-3.5 h-3.5 mr-1" />Accept
                </Button>
              </GlassRow>
            ))}
          </div>
        )
      )}

      {tab === "incoming" && (
        pendingChallenges.length === 0 ? (
          <EmptyState icon={Inbox} text="No incoming challenges." hint="Share your battles to invite friends!" />
        ) : (
          <div className="space-y-2">
            {pendingChallenges.map((battle: any) => (
              <GlassRow key={battle.id} accent="amber">
                <VsAvatars left={battle.challenger_name} right="You" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{battle.challenger_name} challenged you!</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {battle.location_name} • {format(new Date(battle.battle_date), "MMM d")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    <Timer className="w-3 h-3" />
                    {getTimeUntilExpiry(battle.created_at)} left
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => declineBattle(battle.id)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => onAcceptBattle?.(battle.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept
                  </Button>
                </div>
              </GlassRow>
            ))}
          </div>
        )
      )}

      {tab === "history" && (
        history.length === 0 ? (
          <EmptyState icon={Trophy} text="No completed battles yet." hint="Win your first head-to-head!" />
        ) : (
          <div className="space-y-2">
            {history.map((battle: any) => {
              const won = battle.winner_id === user?.id;
              return (
                <GlassRow key={battle.id} accent={won ? "green" : "red"}>
                  <VsAvatars left={battle.challenger_name} right={battle.opponent_name} winner={won ? "left" : "right"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">
                        {battle.challenger_name} vs {battle.opponent_name}
                      </p>
                      <Badge variant={won ? "default" : "secondary"} className="text-[10px] h-4 px-1 shrink-0">
                        {won ? "Won" : "Lost"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {battle.location_name} • {format(new Date(battle.battle_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  {won && (
                    <div className="text-right shrink-0">
                      <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                      <p className="text-[10px] text-green-500 font-bold">+{battle.bonus_points}</p>
                    </div>
                  )}
                </GlassRow>
              );
            })}
          </div>
        )
      )}

      {isEmpty && tab === "open" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const url = subdomainHref('/predict');
            const text = "Battle me on Rainz Weather predictions! 🌧️";
            if (navigator.share) navigator.share({ title: "Rainz Battle", text, url }).catch(() => {});
            else { navigator.clipboard.writeText(`${text} ${url}`); toast.success("Invite link copied!"); }
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />Invite friends to battle
        </Button>
      )}
    </div>
  );
};

function VsAvatars({ left, right, winner }: { left: string; right: string; winner?: "left" | "right" }) {
  const initial = (s: string) => (s || "?").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        winner === "left" ? "bg-green-500/20 border-green-500 text-green-600" : "bg-primary/15 border-primary/30 text-primary"
      }`}>
        {initial(left)}
      </div>
      <span className="text-[9px] font-bold text-muted-foreground">VS</span>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        winner === "right" ? "bg-green-500/20 border-green-500 text-green-600" : "bg-rose-500/15 border-rose-500/30 text-rose-600"
      }`}>
        {initial(right)}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, hint }: { icon: any; text: string; hint?: string }) {
  return (
    <Card className="bg-background/50">
      <CardContent className="p-6 text-center text-muted-foreground">
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{text}</p>
        {hint && <p className="text-[11px] mt-1 opacity-70">{hint}</p>}
      </CardContent>
    </Card>
  );
}
