import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Crown, Target, Flame, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DisplayNameDialog } from "./display-name-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_predictions: number;
  correct_predictions: number;
  is_subscriber?: boolean;
}

export const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [previousLeaderboard, setPreviousLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cacheKey = useMemo(() => "rainz_leaderboard_cache_v1", []);

  useEffect(() => {
    checkDisplayName();
  }, [user]);

  useEffect(() => {
    if (hasDisplayName) {
      fetchLeaderboard();
    }
  }, [hasDisplayName]);

  // Load cached leaderboard instantly so we can fade into the fresh values.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LeaderboardEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLeaderboard(parsed);
        setLoading(false);
        setPreviousLeaderboard(parsed);
      }
    } catch {
      // ignore cache
    }
  }, [cacheKey]);

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

  const fetchLeaderboard = async () => {
    try {
      const old = leaderboard;
      // Get leaderboard data with user_ids
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, total_points")
        .not("display_name", "is", null)
        .order("total_points", { ascending: false })
        .limit(10);

      if (profilesError) throw profilesError;

      // Get streak data for each user and check subscription status
      const leaderboardWithStreaks = await Promise.all(
        (profilesData || []).map(async (profile, index) => {
          const { data: streakData } = await supabase
            .from("user_streaks")
            .select("current_streak, longest_streak")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          const { count: totalPredictions } = await supabase
            .from("weather_predictions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.user_id);

          const { count: correctPredictions } = await supabase
            .from("weather_predictions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.user_id)
            .eq("is_verified", true)
            .eq("is_correct", true);

          // Check subscription status via edge function
          let isSubscriber = false;
          try {
            const { data: session } = await supabase.auth.getSession();
            if (session?.session) {
              const { data: subData } = await supabase.functions.invoke('check-subscription', {
                headers: {
                  Authorization: `Bearer ${session.session.access_token}`,
                },
                body: { check_user_id: profile.user_id }
              });
              isSubscriber = subData?.subscribed || false;
            }
          } catch {
            // Silently fail subscription check
          }

          return {
            rank: index + 1,
            user_id: profile.user_id,
            display_name: profile.display_name,
            total_points: profile.total_points || 0,
            current_streak: streakData?.current_streak || 0,
            longest_streak: streakData?.longest_streak || 0,
            total_predictions: totalPredictions || 0,
            correct_predictions: correctPredictions || 0,
            is_subscriber: isSubscriber,
          };
        })
      );

      // Find current user's rank if not in top 5
      if (user) {
        const userEntry = leaderboardWithStreaks.find(e => e.user_id === user.id);
        if (userEntry && userEntry.rank > 5) {
          setCurrentUserRank(userEntry);
        } else {
          setCurrentUserRank(null);
        }
      }

      const next = leaderboardWithStreaks.slice(0, 5);

      // Cache for next open
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // ignore
      }

      // Fade transition: old -> new
      if (old && old.length > 0) {
        setPreviousLeaderboard(old);
        setIsTransitioning(true);
        // next tick so CSS transition applies
        requestAnimationFrame(() => setLeaderboard(next));
        setTimeout(() => {
          setIsTransitioning(false);
          setPreviousLeaderboard(null);
        }, 350);
      } else {
        setLeaderboard(next);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderList = (entries: LeaderboardEntry[], overlayClassName: string) => (
    <div className={overlayClassName}>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const accuracy = entry.total_predictions > 0
            ? Math.round((entry.correct_predictions / entry.total_predictions) * 100)
            : 0;
          const isCurrentUser = user?.id === entry.user_id;

          return (
            <div
              key={`${entry.rank}-${entry.user_id}-${overlayClassName}`}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${getRankStyle(index)} ${isCurrentUser ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-center w-8">{getRankIcon(index)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/profile/${entry.user_id}`)}
                    className="font-bold text-foreground truncate hover:text-primary hover:underline transition-colors text-left"
                  >
                    {entry.display_name}
                  </button>
                  {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                  {entry.is_subscriber && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center gap-0.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rainz+ Subscriber</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
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
                        <p>
                          Prediction accuracy ({entry.correct_predictions}/{entry.total_predictions} correct)
                        </p>
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
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{entry.total_points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          );
        })}

        {currentUserRank && (
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
                <p className="text-2xl font-bold text-primary">{currentUserRank.total_points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const handleNameSet = (name: string | null) => {
    setShowNameDialog(false);
    if (name) {
      setHasDisplayName(true);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{index + 1}</span>;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/50";
      case 1:
        return "bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/50";
      case 2:
        return "bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/50";
      default:
        return "bg-background/60 border-border/30 hover:bg-background/80";
    }
  };

  // If first time and no display name, show dialog and don't render leaderboard
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

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-md border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold">Top Weather Predictors</h3>
        </div>
        <button
          onClick={() => setShowNameDialog(true)}
          className="text-sm text-primary hover:underline"
        >
          Change Name
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No predictions yet. Be the first!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Previous leaderboard fades out */}
          {previousLeaderboard && isTransitioning && (
            <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none">
              {renderList(previousLeaderboard, "")}
            </div>
          )}
          {/* Current leaderboard fades in */}
          <div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
            {renderList(leaderboard, "")}
          </div>
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
          Predictions are scored at 10 PM CET daily. High temp, low temp, and condition are each evaluated (within 3° tolerance for temps).
        </p>
      </div>

      {/* Dialog for changing name - only shows when button is clicked */}
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
