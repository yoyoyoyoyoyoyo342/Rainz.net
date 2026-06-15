import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Trophy, Crown, Target, Flame, Bot, Calendar, Sparkles, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DisplayNameDialog } from "./display-name-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PredictHero } from "@/components/predict/predict-hero";
import { PillChips } from "@/components/predict/pill-chips";
import { StatPill } from "@/components/predict/stat-pill";
import { GlassRow } from "@/components/predict/glass-row";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_predictions: number;
  correct_predictions: number;
  trophy_count: number;
}

type LeaderboardTab = "monthly" | "alltime";

export const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("monthly");
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);

  const list = activeTab === "monthly" ? monthly : allTime;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.display_name) setHasDisplayName(true);
      else setShowNameDialog(true);
    })();
  }, [user]);

  useEffect(() => {
    if (!hasDisplayName) return;
    (async () => {
      setLoading(true);
      try {
        const [mon, all] = await Promise.all([
          supabase.rpc("get_monthly_leaderboard"),
          supabase.rpc("get_leaderboard"),
        ]);
        const mapRow = (row: any): LeaderboardEntry => ({
          rank: Number(row.rank),
          user_id: row.user_id,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          total_points: Number(row.total_points || 0),
          current_streak: Number(row.current_streak || 0),
          longest_streak: Number(row.longest_streak || 0),
          total_predictions: Number(row.total_predictions || 0),
          correct_predictions: Number(row.correct_predictions || 0),
          trophy_count: Number(row.trophy_count || 0),
        });
        setMonthly((mon.data || []).map(mapRow));
        setAllTime((all.data || []).map(mapRow));

        if (user) {
          const inMonthly = (mon.data || []).find((r: any) => r.user_id === user.id);
          if (inMonthly) setCurrentUserRank(mapRow(inMonthly));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [hasDisplayName, user]);

  if (showNameDialog && !hasDisplayName) {
    return <DisplayNameDialog open={showNameDialog} onClose={(n) => { setShowNameDialog(false); if (n) setHasDisplayName(true); }} allowSkip={false} />;
  }

  const monthName = new Date().toLocaleString("default", { month: "long" });
  const daysLeft = (() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.getDate() - now.getDate();
  })();

  const myEntry = list.find((e) => e.user_id === user?.id);
  const myRank = myEntry?.rank;
  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="space-y-4">
      <PredictHero
        eyebrow={activeTab === "monthly" ? "This Month's Champions" : "All-Time Trophy Leaderboard"}
        eyebrowIcon={activeTab === "monthly" ? Sparkles : Crown}
        title={activeTab === "monthly" ? monthName : "Trophy Leaderboard"}
        subtitle={activeTab === "monthly" ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to climb` : "Monthly winners ranked by trophies earned"}
        gradient={activeTab === "monthly" ? "primary" : "amber"}
        pills={
          <>
            {myRank && <StatPill icon={ChevronUp} value={`#${myRank}`} tone="primary" />}
            {myEntry && <StatPill icon={Flame} value={myEntry.current_streak} tone="orange" />}
          </>
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <PillChips
              value={activeTab}
              onChange={(v) => setActiveTab(v as LeaderboardTab)}
              options={[
                { value: "monthly", label: monthName, icon: Calendar },
                { value: "alltime", label: "All-Time", icon: Crown },
              ]}
            />
            <button onClick={() => setShowNameDialog(true)} className="text-xs text-primary hover:underline shrink-0">
              Edit name
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{activeTab === "monthly" ? "No predictions this month yet. Be the first!" : "No trophies awarded yet."}</p>
        </Card>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 1 && (
            <div className="grid grid-cols-3 gap-2 items-end">
              {/* Silver */}
              <PodiumSpot entry={podium[1]} rank={2} heightClass="h-24" gradientClass="from-gray-300/30 to-gray-400/10 border-gray-300/40" navigate={navigate} showTrophies={activeTab === "alltime"} />
              {/* Gold */}
              <PodiumSpot entry={podium[0]} rank={1} heightClass="h-32" gradientClass="from-yellow-400/40 to-yellow-500/10 border-yellow-400/50" navigate={navigate} crown showTrophies={activeTab === "alltime"} />
              {/* Bronze */}
              <PodiumSpot entry={podium[2]} rank={3} heightClass="h-20" gradientClass="from-amber-600/30 to-amber-700/10 border-amber-600/40" navigate={navigate} showTrophies={activeTab === "alltime"} />
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((entry) => {
                const accuracy = entry.total_predictions > 0 ? Math.round((entry.correct_predictions / entry.total_predictions) * 100) : 0;
                const isBot = entry.user_id === "00000000-0000-0000-0000-000000000001";
                const isMe = user?.id === entry.user_id;
                return (
                  <GlassRow
                    key={`${activeTab}-${entry.rank}-${entry.user_id}`}
                    accent="primary"
                    highlight={isMe}
                    onClick={isBot ? undefined : () => navigate(`/profile/${entry.user_id}`)}
                  >
                    <div className="w-7 text-center text-sm font-bold text-muted-foreground">#{entry.rank}</div>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={entry.avatar_url || undefined} alt={entry.display_name} />
                      <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                        {(entry.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate flex items-center gap-1">
                          {isBot && <Bot className="w-3.5 h-3.5 text-primary" />}
                          {entry.display_name}
                        </span>
                        {isMe && <Badge variant="outline" className="text-[10px] h-4 px-1">You</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" />{accuracy}%</span>
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{entry.current_streak}</span>
                        <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-400" />{entry.trophy_count}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary leading-none flex items-center gap-1 justify-end">
                        {activeTab === "alltime" && <Trophy className="w-4 h-4 text-amber-400" />}
                        {(activeTab === "alltime" ? entry.trophy_count : entry.total_points).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{activeTab === "alltime" ? "trophies" : "points"}</p>
                    </div>
                  </GlassRow>
                );
              })}
            </div>
          )}

          {/* Your sticky position */}
          {currentUserRank && !list.some(e => e.user_id === user?.id) && (
            <GlassRow accent="primary" highlight>
              <div className="w-7 text-center text-sm font-bold text-primary">#{currentUserRank.rank}</div>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={currentUserRank.avatar_url || undefined} />
                <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                  {(currentUserRank.display_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate">{currentUserRank.display_name}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">You</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Keep predicting to climb higher</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary leading-none flex items-center gap-1 justify-end">
                  {activeTab === "alltime" && <Trophy className="w-4 h-4 text-amber-400" />}
                  {(activeTab === "alltime" ? currentUserRank.trophy_count : currentUserRank.total_points).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeTab === "alltime" ? "trophies" : "points"}</p>
              </div>
            </GlassRow>
          )}
        </>
      )}
    </div>
  );
};

function PodiumSpot({
  entry,
  rank,
  heightClass,
  gradientClass,
  navigate,
  crown,
  showTrophies,
}: {
  entry?: LeaderboardEntry;
  rank: number;
  heightClass: string;
  gradientClass: string;
  navigate: ReturnType<typeof useNavigate>;
  crown?: boolean;
  showTrophies?: boolean;
}) {
  if (!entry) {
    return (
      <div className={`flex flex-col items-center justify-end gap-2`}>
        <div className={`w-full rounded-t-xl border-t border-x bg-gradient-to-b ${gradientClass} ${heightClass} opacity-30 flex items-center justify-center`}>
          <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>
        </div>
      </div>
    );
  }
  const isBot = entry.user_id === "00000000-0000-0000-0000-000000000001";
  const value = showTrophies ? entry.trophy_count : entry.total_points;
  return (
    <button
      onClick={isBot ? undefined : () => navigate(`/profile/${entry.user_id}`)}
      className="flex flex-col items-center gap-2 group"
    >
      <div className="relative">
        {crown && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow" />}
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
          <AvatarImage src={entry.avatar_url || undefined} />
          <AvatarFallback className="text-base font-bold bg-primary/20 text-primary">
            {(entry.display_name || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center w-full">
        <p className="text-xs font-bold truncate px-1 group-hover:text-primary transition-colors">{entry.display_name}</p>
        <p className="text-[11px] font-bold text-primary flex items-center justify-center gap-1">
          {showTrophies && <Trophy className="w-3 h-3 text-amber-400" />}
          {value.toLocaleString()}
        </p>
      </div>
      <div className={`w-full rounded-t-xl border-t border-x bg-gradient-to-b ${gradientClass} ${heightClass} flex items-start justify-center pt-1`}>
        <span className="text-xl font-bold text-foreground/80">#{rank}</span>
      </div>
    </button>
  );
}
