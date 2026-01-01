import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Trophy, Star, Target, Flame, Gamepad2, MapPin, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

interface UserStats {
  predictions_made: number;
  correct_predictions: number;
  current_streak: number;
  total_points: number;
  battles_won: number;
  games_played: number;
  locations_searched: number;
  ai_chats: number;
  shares: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  predictions: <Target className="w-4 h-4" />,
  accuracy: <Star className="w-4 h-4" />,
  streaks: <Flame className="w-4 h-4" />,
  points: <Trophy className="w-4 h-4" />,
  battles: <Trophy className="w-4 h-4" />,
  games: <Gamepad2 className="w-4 h-4" />,
  exploration: <MapPin className="w-4 h-4" />,
  special: <Sparkles className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  predictions: 'Predictions',
  accuracy: 'Accuracy',
  streaks: 'Streaks',
  points: 'Points',
  battles: 'Battles',
  games: 'Games',
  exploration: 'Exploration',
  special: 'Special',
};

export function AchievementsDisplay() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_value', { ascending: true });

      setAchievements(achievementsData || []);

      // Fetch user's earned achievements
      const { data: userAchievementsData } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);

      setUserAchievements(userAchievementsData || []);

      // Calculate user stats from various tables
      const [predictionsResult, streaksResult, profileResult, battlesResult, analyticsResult] = await Promise.all([
        supabase.from('weather_predictions').select('id, is_correct').eq('user_id', user.id),
        supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).single(),
        supabase.from('profiles').select('total_points').eq('user_id', user.id).single(),
        supabase.from('prediction_battles').select('winner_id').eq('winner_id', user.id),
        supabase.from('analytics_events').select('event_type, metadata').eq('user_id', user.id),
      ]);

      const predictions = predictionsResult.data || [];
      const correctPredictions = predictions.filter(p => p.is_correct).length;
      const analyticsEvents = analyticsResult.data || [];
      
      const gamesPlayed = analyticsEvents.filter(e => e.event_type === 'game_played').length;
      const locationSearches = analyticsEvents.filter(e => e.event_type === 'location_search').length;
      const aiChats = analyticsEvents.filter(e => e.event_type === 'ai_chat_message').length;
      const shares = analyticsEvents.filter(e => e.event_type === 'share_weather').length;

      setUserStats({
        predictions_made: predictions.length,
        correct_predictions: correctPredictions,
        current_streak: streaksResult.data?.current_streak || 0,
        total_points: profileResult.data?.total_points || 0,
        battles_won: battlesResult.data?.length || 0,
        games_played: gamesPlayed,
        locations_searched: locationSearches,
        ai_chats: aiChats,
        shares: shares,
      });

      // Check for new achievements to award
      if (achievementsData) {
        await checkAndAwardAchievements(achievementsData, userAchievementsData || [], {
          predictions_made: predictions.length,
          correct_predictions: correctPredictions,
          current_streak: streaksResult.data?.current_streak || 0,
          total_points: profileResult.data?.total_points || 0,
          battles_won: battlesResult.data?.length || 0,
          games_played: gamesPlayed,
          locations_searched: locationSearches,
          ai_chats: aiChats,
          shares: shares,
        });
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardAchievements = async (
    allAchievements: Achievement[],
    earnedAchievements: UserAchievement[],
    stats: UserStats
  ) => {
    if (!user) return;

    const earnedIds = new Set(earnedAchievements.map(a => a.achievement_id));
    const newAchievements: string[] = [];

    for (const achievement of allAchievements) {
      if (earnedIds.has(achievement.id)) continue;

      let currentValue = 0;
      switch (achievement.requirement_type) {
        case 'predictions_made':
          currentValue = stats.predictions_made;
          break;
        case 'correct_predictions':
          currentValue = stats.correct_predictions;
          break;
        case 'current_streak':
          currentValue = stats.current_streak;
          break;
        case 'total_points':
          currentValue = stats.total_points;
          break;
        case 'battles_won':
          currentValue = stats.battles_won;
          break;
        case 'games_played':
          currentValue = stats.games_played;
          break;
        case 'locations_searched':
          currentValue = stats.locations_searched;
          break;
        case 'ai_chats':
          currentValue = stats.ai_chats;
          break;
        case 'shares':
          currentValue = stats.shares;
          break;
      }

      if (currentValue >= achievement.requirement_value) {
        newAchievements.push(achievement.id);
      }
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      const inserts = newAchievements.map(id => ({
        user_id: user.id,
        achievement_id: id,
      }));

      await supabase.from('user_achievements').insert(inserts);
      
      // Refresh data
      const { data: updatedUserAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);
      
      setUserAchievements(updatedUserAchievements || []);
    }
  };

  const getProgressForAchievement = (achievement: Achievement): number => {
    if (!userStats) return 0;

    let currentValue = 0;
    switch (achievement.requirement_type) {
      case 'predictions_made':
        currentValue = userStats.predictions_made;
        break;
      case 'correct_predictions':
        currentValue = userStats.correct_predictions;
        break;
      case 'current_streak':
        currentValue = userStats.current_streak;
        break;
      case 'total_points':
        currentValue = userStats.total_points;
        break;
      case 'battles_won':
        currentValue = userStats.battles_won;
        break;
      case 'games_played':
        currentValue = userStats.games_played;
        break;
      case 'locations_searched':
        currentValue = userStats.locations_searched;
        break;
      case 'ai_chats':
        currentValue = userStats.ai_chats;
        break;
      case 'shares':
        currentValue = userStats.shares;
        break;
    }

    return Math.min((currentValue / achievement.requirement_value) * 100, 100);
  };

  const earnedIds = new Set(userAchievements.map(a => a.achievement_id));
  const categories = [...new Set(achievements.map(a => a.category))];
  const earnedCount = userAchievements.length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievements
          </div>
          <Badge variant="secondary" className="text-sm">
            {earnedCount} / {totalCount}
          </Badge>
        </CardTitle>
        <Progress value={(earnedCount / totalCount) * 100} className="h-2" />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 mb-4">
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {CATEGORY_ICONS[category]}
                <span className="ml-1">{CATEGORY_LABELS[category]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid gap-3">
                {achievements
                  .filter(a => a.category === category)
                  .map(achievement => {
                    const isEarned = earnedIds.has(achievement.id);
                    const progress = getProgressForAchievement(achievement);

                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          isEarned
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/30 border-border/50 opacity-70"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "text-2xl",
                            !isEarned && "grayscale opacity-50"
                          )}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={cn(
                                "font-medium text-sm",
                                isEarned ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {achievement.name}
                              </h4>
                              <Badge variant={isEarned ? "default" : "outline"} className="text-xs shrink-0">
                                +{achievement.points}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {achievement.description}
                            </p>
                            {!isEarned && (
                              <div className="mt-2">
                                <Progress value={progress} className="h-1.5" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.floor(progress)}% complete
                                </p>
                              </div>
                            )}
                            {isEarned && (
                              <p className="text-xs text-primary mt-1">
                                ✓ Earned
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
