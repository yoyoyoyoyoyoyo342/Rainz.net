import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Crown, Target, Flame, Info, Bot, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DisplayNameDialog } from "./display-name-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_predictions: number;
  correct_predictions: number;
  trophy_count: number;
  is_subscriber?: boolean;
}

type LeaderboardTab = "monthly" | "alltime";

export const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("monthly");
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);

  const leaderboard = activeTab === "monthly" ? monthlyLeaderboard : allTimeLeaderboard;

  useEffect(() => {
    checkDisplayName();
  }, [user]);

  useEffect(() => {
    if (hasDisplayName) {
      fetchAllTimeLeaderboard();
      fetchMonthlyLeaderboard();
    }
  }, [hasDisplayName]);

  const checkDisplayName = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      if (data?.display_name) {
        setHasDisplayName(true);
      } else {
        setShowNameDialog(true);
      }
    } catch (error) {
      console.error("Error checking display name:", error);
    }
  };

  const fetchMonthlyLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc("get_monthly_leaderboard");
      if (error) throw error;

      console.log("Monthly leaderboard RPC response:", data);

      const entries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        rank: row.rank,
        user_id: row.user_id,
        display_name: row.display_name,
        total_points: row.total_points,
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        total_predictions: row.total_predictions,
        correct_predictions: row.correct_predictions,
        trophy_count: row.trophy_count,
      }));

      console.log("Mapped monthly entries:", entries);
      setMonthlyLeaderboard(entries.slice(0, 5));
    } catch (error) {
      console.error("Error fetching monthly leaderboard:", error);
    }
  };

  const fetchAllTimeLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) throw error;

      console.log("All-time leaderboard RPC response:", data);

      const leaderboardWithStreaks: LeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
        rank: row.rank || index + 1,
        user_id: row.user_id,
        display_name: row.display_name,
        total_points: row.total_points,
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        total_predictions: row.total_predictions,
        correct_predictions: row.correct_predictions,
        trophy_count: row.trophy_count,
      }));

      console.log("Mapped all-time entries:", leaderboardWithStreaks);

      if (user) {
        const userEntry = leaderboardWithStreaks.find(e => e.user_id === user.id);
        if (userEntry && userEntry.rank > 5) {
          setCurrentUserRank(userEntry);
        } else {
          setCurrentUserRank(null);
        }
      }

      setAllTimeLeaderboard(leaderboardWithStreaks.slice(0, 5));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSet = (name: string | null) => {
    setShowNameDialog(false);
    if (name) {
      setHasDisplayName(true);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;
      case 2: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{index + 1}</span>;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/50";
      case 1: return "bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/50";
      case 2: return "bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/50";
      default: return "bg-background/60 border-border/30 hover:bg-background/80";
    }
  };

  if (showNameDialog && !hasDisplayName) {
    return <DisplayNameDialog open={showNameDialog} onClose={handleNameSet} allowSkip={false} />;
  }

  if (loading) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-md border-border/50">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-md border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold">Monthly & Trophy Leaderboard</h3>
        </div>
        <button
          onClick={() => setShowNameDialog(true)}
          className="text-sm text-primary hover:underline"
        >
          Change Name
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardTab)} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly" className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {monthName}
          </TabsTrigger>
          <TabsTrigger value="alltime" className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            Trophy Board
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{activeTab === "monthly" ? `No predictions this month yet. Be the first!` : "No predictions yet. Be the first!"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const accuracy = entry.total_predictions > 0
              ? Math.round((entry.correct_predictions / entry.total_predictions) * 100)
              : 0;
            const isCurrentUser = user?.id === entry.user_id;

            return (
              <div
                key={`${activeTab}-${entry.rank}-${entry.user_id}`}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${getRankStyle(index)} ${isCurrentUser ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-center w-8">{getRankIcon(index)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.user_id === "00000000-0000-0000-0000-000000000001" ? (
                      <span className="font-bold text-primary truncate flex items-center gap-1">
                        <Bot className="w-4 h-4" />
                        {entry.display_name}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate(`/profile/${entry.user_id}`)}
                        className="font-bold text-foreground truncate hover:text-primary hover:underline transition-colors text-left"
                      >
                        {entry.display_name}
                      </button>
                    )}
                    {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {accuracy}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prediction accuracy ({entry.correct_predictions}/{entry.total_predictions} correct)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {entry.current_streak}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current streak (Best: {entry.longest_streak})</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-muted-foreground/60">{entry.total_predictions} predictions</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      {entry.trophy_count}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {activeTab === "alltime" ? (
                    <>
                      <p className="text-2xl font-bold text-amber-400">🏆 {entry.trophy_count}</p>
                      <p className="text-xs text-muted-foreground">total trophies</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-primary">{entry.total_points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {activeTab === "alltime" && currentUserRank && (
            <>
              <div className="text-center text-muted-foreground py-1">• • •</div>
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-primary/5 border-primary/30 ring-2 ring-primary">
                <div className="flex items-center justify-center w-8">
                  <span className="text-sm font-bold text-primary">#{currentUserRank.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{currentUserRank.display_name}</span>
                    <Badge variant="outline" className="text-xs">You</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {currentUserRank.total_predictions > 0
                        ? Math.round((currentUserRank.correct_predictions / currentUserRank.total_predictions) * 100)
                        : 0}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {currentUserRank.current_streak}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-400">🏆 {currentUserRank.trophy_count}</p>
                  <p className="text-xs text-muted-foreground">total trophies</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Scoring explanation */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">How Scoring Works</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>All 3 correct</span>
            <span className="font-bold text-green-500">+300 pts</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>2 correct</span>
            <span className="font-bold text-green-500">+200 pts</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>1 correct</span>
            <span className="font-bold text-green-500">+100 pts</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>All wrong</span>
            <span className="font-bold text-red-500">-100 pts</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>Daily streak</span>
            <span className="font-bold text-blue-500">+25 pts</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>Battle win</span>
            <span className="font-bold text-yellow-500">+50 pts</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {activeTab === "monthly" 
            ? `Monthly leaderboard resets on the 1st of each month and ranks by total points earned. At month-end, the player with the most points wins 1 trophy.`
            : `Trophy board ranks players by total trophies earned across all months. Trophies carry over month to month.`
          }
        </p>
      </div>

      {showNameDialog && hasDisplayName && (
        <DisplayNameDialog 
          open={showNameDialog} 
          onClose={handleNameSet}
          allowSkip={true}
        />
      )}
    </Card>
  );
};
