import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Trophy, 
  Flame, 
  Target, 
  Swords, 
  Award,
  TrendingUp,
  Calendar,
  CheckCircle,
  Star,
  Crown,
  Shield,
  Sparkles,
  Zap,
  Medal,
  User,
  Clock,
  Activity,
  Edit3,
  Camera,
  Save,
  X,
  Loader2,
  Eye,
  Sunrise,
  CloudRain,
  Snowflake,
  ThermometerSun,
  Wind,
  MapPin,
  Heart,
  Gem,
  Rocket,
  Brain,
  Gift
} from "lucide-react";

interface UserProfileData {
  display_name: string;
  total_points: number;
  created_at: string;
  bio: string | null;
  avatar_url: string | null;
  shop_points: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_visits: number;
}

interface BattleStats {
  total_battles: number;
  wins: number;
  losses: number;
  ties: number;
  pending: number;
  currentWinStreak: number;
  longestWinStreak: number;
}

interface PredictionStats {
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
}

// Stat item component
const StatItem = ({ 
  icon: Icon, 
  label, 
  value, 
  color = "text-primary"
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color?: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
    <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  </div>
);

// Achievement badge component (simplified)
const AchievementBadge = ({ 
  icon: Icon, 
  name, 
  unlocked, 
  rarity = "common"
}: { 
  icon: any; 
  name: string; 
  unlocked: boolean; 
  rarity?: "common" | "rare" | "epic" | "legendary";
}) => {
  const rarityColors = {
    common: "border-zinc-500/30 bg-zinc-500/10",
    rare: "border-blue-500/30 bg-blue-500/10",
    epic: "border-purple-500/30 bg-purple-500/10",
    legendary: "border-amber-500/30 bg-amber-500/10",
  };

  const iconColors = {
    common: "text-zinc-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
  };

  if (!unlocked) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${rarityColors[rarity]}`}>
      <Icon className={`h-4 w-4 ${iconColors[rarity]}`} />
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null);
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (profile) {
      setEditDisplayName(profile.display_name || "");
      setEditBio(profile.bio || "");
    }
  }, [profile]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, total_points, created_at, bio, avatar_url, shop_points")
        .eq("user_id", userId)
        .maybeSingle();

      setProfile(profileData);

      const { data: streakInfo } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak, total_visits")
        .eq("user_id", userId)
        .maybeSingle();

      setStreakData(streakInfo);

      const { data: battles } = await supabase
        .from("prediction_battles")
        .select("status, winner_id, challenger_id, opponent_id, updated_at")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (battles) {
        const wins = battles.filter(b => b.winner_id === userId).length;
        const completed = battles.filter(b => b.status === "completed");
        const losses = completed.filter(b => b.winner_id && b.winner_id !== userId).length;
        const ties = completed.filter(b => !b.winner_id).length;
        const pending = battles.filter(b => b.status === "pending" || b.status === "accepted").length;

        let currentWinStreak = 0;
        const completedBattles = battles.filter(b => b.status === "completed");
        for (const battle of completedBattles) {
          if (battle.winner_id === userId) {
            currentWinStreak++;
          } else {
            break;
          }
        }

        let longestWinStreak = 0;
        let tempStreak = 0;
        for (const battle of [...completedBattles].reverse()) {
          if (battle.winner_id === userId) {
            tempStreak++;
            longestWinStreak = Math.max(longestWinStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        setBattleStats({
          total_battles: battles.length,
          wins,
          losses,
          ties,
          pending,
          currentWinStreak,
          longestWinStreak,
        });
      }

      const { data: predictions } = await supabase
        .from("weather_predictions")
        .select("is_verified, is_correct")
        .eq("user_id", userId);

      if (predictions) {
        const verified = predictions.filter(p => p.is_verified);
        const correct = verified.filter(p => p.is_correct).length;
        const accuracy = verified.length > 0 
          ? Math.round((correct / verified.length) * 100) 
          : 0;

        setPredictionStats({
          total_predictions: predictions.length,
          correct_predictions: correct,
          accuracy,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      await supabase.storage.from('avatars').remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl + `?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchUserData();
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserData();
      setEditDialogOpen(false);
      toast.success("Profile updated!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground text-sm mb-4">This profile doesn't exist.</p>
          <Button onClick={() => navigate(-1)} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const daysSinceJoined = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const winRate = battleStats && (battleStats.wins + battleStats.losses) > 0 
    ? Math.round((battleStats.wins / (battleStats.wins + battleStats.losses)) * 100) 
    : 0;

  const userLevel = Math.floor((profile.total_points || 0) / 500) + 1;

  const achievements = [
    { icon: CheckCircle, name: "First Prediction", unlocked: (predictionStats?.total_predictions || 0) > 0, rarity: "common" as const },
    { icon: Target, name: "10 Predictions", unlocked: (predictionStats?.total_predictions || 0) >= 10, rarity: "common" as const },
    { icon: Sparkles, name: "Weather Guru", unlocked: (predictionStats?.total_predictions || 0) >= 50, rarity: "rare" as const },
    { icon: Medal, name: "100 Predictions", unlocked: (predictionStats?.total_predictions || 0) >= 100, rarity: "epic" as const },
    { icon: Eye, name: "Sharp Eye (50%+)", unlocked: (predictionStats?.accuracy || 0) >= 50 && (predictionStats?.total_predictions || 0) >= 5, rarity: "common" as const },
    { icon: Target, name: "Accuracy Pro (70%+)", unlocked: (predictionStats?.accuracy || 0) >= 70 && (predictionStats?.total_predictions || 0) >= 5, rarity: "rare" as const },
    { icon: Gem, name: "Weather Savant (85%+)", unlocked: (predictionStats?.accuracy || 0) >= 85 && (predictionStats?.total_predictions || 0) >= 10, rarity: "epic" as const },
    { icon: Flame, name: "3-Day Streak", unlocked: (streakData?.longest_streak || 0) >= 3, rarity: "common" as const },
    { icon: Flame, name: "7-Day Streak", unlocked: (streakData?.longest_streak || 0) >= 7, rarity: "rare" as const },
    { icon: Zap, name: "14-Day Streak", unlocked: (streakData?.longest_streak || 0) >= 14, rarity: "epic" as const },
    { icon: Crown, name: "30-Day Streak", unlocked: (streakData?.longest_streak || 0) >= 30, rarity: "legendary" as const },
    { icon: Swords, name: "First Battle", unlocked: (battleStats?.total_battles || 0) >= 1, rarity: "common" as const },
    { icon: Trophy, name: "Battle Victor", unlocked: (battleStats?.wins || 0) >= 1, rarity: "common" as const },
    { icon: Shield, name: "5 Battle Wins", unlocked: (battleStats?.wins || 0) >= 5, rarity: "rare" as const },
    { icon: Crown, name: "10 Battle Wins", unlocked: (battleStats?.wins || 0) >= 10, rarity: "epic" as const },
    { icon: TrendingUp, name: "100 Points", unlocked: (profile.total_points || 0) >= 100, rarity: "common" as const },
    { icon: TrendingUp, name: "500 Points", unlocked: (profile.total_points || 0) >= 500, rarity: "rare" as const },
    { icon: Gem, name: "2500 Points", unlocked: (profile.total_points || 0) >= 2500, rarity: "epic" as const },
    { icon: Crown, name: "5000 Points", unlocked: (profile.total_points || 0) >= 5000, rarity: "legendary" as const },
    { icon: Calendar, name: "10 Visits", unlocked: (streakData?.total_visits || 0) >= 10, rarity: "common" as const },
    { icon: Heart, name: "50 Visits", unlocked: (streakData?.total_visits || 0) >= 50, rarity: "rare" as const },
    { icon: Sunrise, name: "Week Veteran", unlocked: daysSinceJoined >= 7, rarity: "common" as const },
    { icon: MapPin, name: "Month Veteran", unlocked: daysSinceJoined >= 30, rarity: "rare" as const },
    { icon: Star, name: "OG Member (90+ days)", unlocked: daysSinceJoined >= 90, rarity: "epic" as const },
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {/* Profile Header Card */}
        <Card className="relative overflow-hidden mb-4">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          
          <div className="relative p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-background shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center border-2 border-background shadow-lg">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {profile.display_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                
                {/* Level badge */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-background">
                  {userLevel}
                </div>

                {/* Edit avatar overlay */}
                {isOwnProfile && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">{profile.display_name || "Anonymous"}</h1>
                  {isOwnProfile && (
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                              id="displayName"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder="Enter your display name"
                              maxLength={50}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                              id="bio"
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Tell us about yourself..."
                              rows={3}
                              maxLength={200}
                            />
                            <p className="text-xs text-muted-foreground text-right">{editBio.length}/200</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{profile.bio}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {memberSince}</span>
                  <span className="text-border">•</span>
                  <span>{daysSinceJoined} days</span>
                </div>
              </div>
            </div>

            {/* Points Summary */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Trophy className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-primary">{(profile.total_points || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-500">{streakData?.current_streak || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Streak</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Sparkles className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-500">{(profile.shop_points || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Shop Pts</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs for Stats & Achievements */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="achievements">
              Achievements ({unlockedAchievements.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-4">
            {/* Prediction Stats */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Predictions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatItem 
                  icon={Activity} 
                  label="Total Made" 
                  value={predictionStats?.total_predictions || 0}
                  color="text-primary"
                />
                <StatItem 
                  icon={CheckCircle} 
                  label="Correct" 
                  value={predictionStats?.correct_predictions || 0}
                  color="text-green-500"
                />
                <StatItem 
                  icon={Target} 
                  label="Accuracy" 
                  value={`${predictionStats?.accuracy || 0}%`}
                  color="text-blue-500"
                />
                <StatItem 
                  icon={Flame} 
                  label="Best Streak" 
                  value={streakData?.longest_streak || 0}
                  color="text-orange-500"
                />
              </div>
            </Card>

            {/* Battle Stats */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-500" />
                Battles
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatItem 
                  icon={Swords} 
                  label="Total Battles" 
                  value={battleStats?.total_battles || 0}
                  color="text-primary"
                />
                <StatItem 
                  icon={Trophy} 
                  label="Wins" 
                  value={battleStats?.wins || 0}
                  color="text-green-500"
                />
                <StatItem 
                  icon={Target} 
                  label="Win Rate" 
                  value={`${winRate}%`}
                  color="text-blue-500"
                />
                <StatItem 
                  icon={Shield} 
                  label="Best Win Streak" 
                  value={battleStats?.longestWinStreak || 0}
                  color="text-purple-500"
                />
              </div>
              
              {/* Win/Loss Bar */}
              {battleStats && (battleStats.wins + battleStats.losses) > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{battleStats.wins}W</span>
                    <span>{battleStats.losses}L</span>
                  </div>
                  <div className="h-2 rounded-full bg-red-500/30 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Activity Stats */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                Activity
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatItem 
                  icon={Calendar} 
                  label="Total Visits" 
                  value={streakData?.total_visits || 0}
                  color="text-primary"
                />
                <StatItem 
                  icon={Clock} 
                  label="Days Active" 
                  value={daysSinceJoined}
                  color="text-muted-foreground"
                />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="achievements">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Unlocked Achievements
                </h3>
                <span className="text-xs text-muted-foreground">
                  {unlockedAchievements.length}/{achievements.length}
                </span>
              </div>
              
              <Progress 
                value={(unlockedAchievements.length / achievements.length) * 100} 
                className="h-2 mb-4"
              />
              
              {unlockedAchievements.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {unlockedAchievements.map((achievement, i) => (
                    <AchievementBadge
                      key={i}
                      icon={achievement.icon}
                      name={achievement.name}
                      unlocked={true}
                      rarity={achievement.rarity}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No achievements yet</p>
                  <p className="text-xs">Make predictions to earn achievements!</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;
