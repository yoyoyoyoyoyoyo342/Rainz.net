import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Star, Crown, Flame, Snowflake, Leaf, Sun, Calendar, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonalStats {
  userId: string;
  displayName: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  points: number;
  rank: number;
  badges: string[];
}

interface SeasonInfo {
  name: string;
  icon: React.ReactNode;
  startMonth: number;
  endMonth: number;
  color: string;
}

const SEASONS: SeasonInfo[] = [
  { name: "Winter", icon: <Snowflake className="w-4 h-4" />, startMonth: 12, endMonth: 2, color: "text-blue-400" },
  { name: "Spring", icon: <Leaf className="w-4 h-4" />, startMonth: 3, endMonth: 5, color: "text-green-400" },
  { name: "Summer", icon: <Sun className="w-4 h-4" />, startMonth: 6, endMonth: 8, color: "text-yellow-400" },
  { name: "Fall", icon: <Flame className="w-4 h-4" />, startMonth: 9, endMonth: 11, color: "text-orange-400" },
];

const MONTHLY_BADGES = [
  { id: "gold", name: "Gold Forecaster", icon: <Crown className="w-4 h-4 text-yellow-500" />, requirement: "Top 1 in monthly rankings" },
  { id: "silver", name: "Silver Predictor", icon: <Medal className="w-4 h-4 text-gray-400" />, requirement: "Top 3 in monthly rankings" },
  { id: "bronze", name: "Bronze Observer", icon: <Award className="w-4 h-4 text-amber-600" />, requirement: "Top 10 in monthly rankings" },
  { id: "streak", name: "Streak Master", icon: <Flame className="w-4 h-4 text-orange-500" />, requirement: "7+ day prediction streak" },
  { id: "perfect", name: "Perfect Week", icon: <Star className="w-4 h-4 text-purple-500" />, requirement: "100% accuracy for a week" },
];

function getCurrentSeason(): SeasonInfo {
  const month = new Date().getMonth() + 1;
  return SEASONS.find(s => 
    s.startMonth <= s.endMonth 
      ? month >= s.startMonth && month <= s.endMonth
      : month >= s.startMonth || month <= s.endMonth
  ) || SEASONS[0];
}

function getMonthName(monthIndex: number): string {
  return new Date(2024, monthIndex).toLocaleString('default', { month: 'long' });
}

export function SeasonalTournament() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyLeaders, setMonthlyLeaders] = useState<SeasonalStats[]>([]);
  const [seasonalLeaders, setSeasonalLeaders] = useState<SeasonalStats[]>([]);
  const [userStats, setUserStats] = useState<SeasonalStats | null>(null);
  const [activeTab, setActiveTab] = useState("monthly");

  const currentSeason = getCurrentSeason();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchTournamentData();
  }, [user]);

  const fetchTournamentData = async () => {
    setLoading(true);
    try {
      // Get current month's start and end dates
      const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      // Get season's start and end dates
      const seasonStartMonth = currentSeason.startMonth - 1;
      const seasonYear = currentSeason.startMonth === 12 && currentMonth < 3 ? currentYear - 1 : currentYear;
      const seasonStart = new Date(seasonYear, seasonStartMonth, 1).toISOString().split('T')[0];
      const seasonEndMonth = currentSeason.endMonth - 1;
      const seasonEndYear = currentSeason.startMonth > currentSeason.endMonth && currentMonth >= currentSeason.startMonth ? currentYear + 1 : currentYear;
      const seasonEnd = new Date(seasonEndYear, seasonEndMonth + 1, 0).toISOString().split('T')[0];

      // Fetch monthly predictions with user info
      const { data: monthlyPredictions } = await supabase
        .from("weather_predictions")
        .select("user_id, is_correct, points_earned, prediction_date")
        .gte("prediction_date", monthStart)
        .lte("prediction_date", monthEnd)
        .eq("is_verified", true);

      // Fetch seasonal predictions
      const { data: seasonalPredictions } = await supabase
        .from("weather_predictions")
        .select("user_id, is_correct, points_earned, prediction_date")
        .gte("prediction_date", seasonStart)
        .lte("prediction_date", seasonEnd)
        .eq("is_verified", true);

      // Process monthly data
      const monthlyStats = processStats(monthlyPredictions || []);
      const seasonalStats = processStats(seasonalPredictions || []);

      // Fetch display names for top users
      const allUserIds = [...new Set([...monthlyStats.map(s => s.userId), ...seasonalStats.map(s => s.userId)])];
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", allUserIds);

        const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name || "Anonymous"]) || []);
        
        monthlyStats.forEach(s => s.displayName = nameMap.get(s.userId) || "Anonymous");
        seasonalStats.forEach(s => s.displayName = nameMap.get(s.userId) || "Anonymous");
      }

      // Sort by points and assign ranks
      monthlyStats.sort((a, b) => b.points - a.points);
      seasonalStats.sort((a, b) => b.points - a.points);
      
      monthlyStats.forEach((s, i) => {
        s.rank = i + 1;
        s.badges = assignBadges(s, i + 1);
      });
      seasonalStats.forEach((s, i) => {
        s.rank = i + 1;
        s.badges = assignBadges(s, i + 1);
      });

      setMonthlyLeaders(monthlyStats.slice(0, 10));
      setSeasonalLeaders(seasonalStats.slice(0, 10));

      // Find current user stats
      if (user) {
        const userMonthly = monthlyStats.find(s => s.userId === user.id);
        setUserStats(userMonthly || null);
      }
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (predictions: any[]): SeasonalStats[] => {
    const userMap = new Map<string, SeasonalStats>();

    predictions.forEach(p => {
      if (!userMap.has(p.user_id)) {
        userMap.set(p.user_id, {
          userId: p.user_id,
          displayName: "Anonymous",
          totalPredictions: 0,
          correctPredictions: 0,
          accuracy: 0,
          points: 0,
          rank: 0,
          badges: [],
        });
      }

      const stats = userMap.get(p.user_id)!;
      stats.totalPredictions++;
      if (p.is_correct) stats.correctPredictions++;
      stats.points += p.points_earned || 0;
      stats.accuracy = Math.round((stats.correctPredictions / stats.totalPredictions) * 100);
    });

    return Array.from(userMap.values());
  };

  const assignBadges = (stats: SeasonalStats, rank: number): string[] => {
    const badges: string[] = [];
    if (rank === 1) badges.push("gold");
    else if (rank <= 3) badges.push("silver");
    else if (rank <= 10) badges.push("bronze");
    if (stats.accuracy === 100 && stats.totalPredictions >= 7) badges.push("perfect");
    return badges;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const daysLeftInMonth = new Date(currentYear, currentMonth + 1, 0).getDate() - new Date().getDate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tournament Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-primary/20 ${currentSeason.color}`}>
                {currentSeason.icon}
              </div>
              <div>
                <h3 className="font-semibold">{currentSeason.name} Tournament</h3>
                <p className="text-xs text-muted-foreground">{getMonthName(currentMonth)} {currentYear}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{daysLeftInMonth} days left</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Stats */}
      {userStats && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                  #{userStats.rank}
                </div>
                <div>
                  <p className="font-medium">Your Ranking</p>
                  <p className="text-xs text-muted-foreground">
                    {userStats.totalPredictions} predictions • {userStats.accuracy}% accuracy
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{userStats.points} pts</p>
                <div className="flex gap-1 justify-end mt-1">
                  {userStats.badges.map(badge => {
                    const badgeInfo = MONTHLY_BADGES.find(b => b.id === badge);
                    return badgeInfo ? (
                      <div key={badge} title={badgeInfo.name}>
                        {badgeInfo.icon}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly" className="gap-2">
            <Calendar className="w-4 h-4" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="gap-2">
            {currentSeason.icon}
            {currentSeason.name}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <LeaderboardList leaders={monthlyLeaders} getRankIcon={getRankIcon} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="seasonal" className="mt-4">
          <LeaderboardList leaders={seasonalLeaders} getRankIcon={getRankIcon} currentUserId={user?.id} />
        </TabsContent>
      </Tabs>

      {/* Badges Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Tournament Badges
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MONTHLY_BADGES.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                {badge.icon}
                <div>
                  <p className="text-xs font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.requirement}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderboardList({ 
  leaders, 
  getRankIcon, 
  currentUserId 
}: { 
  leaders: SeasonalStats[]; 
  getRankIcon: (rank: number) => React.ReactNode;
  currentUserId?: string;
}) {
  if (leaders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No predictions yet this period</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to make a prediction!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {leaders.map((leader) => (
            <div
              key={leader.userId}
              className={`flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                leader.userId === currentUserId ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(leader.rank)}
                <div>
                  <p className="font-medium text-sm">
                    {leader.displayName}
                    {leader.userId === currentUserId && (
                      <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{leader.totalPredictions} predictions</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {leader.accuracy}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {leader.badges.map(badge => {
                    const badgeInfo = MONTHLY_BADGES.find(b => b.id === badge);
                    return badgeInfo ? (
                      <div key={badge} title={badgeInfo.name}>
                        {badgeInfo.icon}
                      </div>
                    ) : null;
                  })}
                </div>
                <Badge variant="outline" className="font-mono">
                  {leader.points} pts
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
