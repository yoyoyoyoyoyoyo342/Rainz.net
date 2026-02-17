import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, Trophy, Copy, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";

interface StreakChallengeProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export function StreakChallenge({ latitude, longitude, locationName }: StreakChallengeProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  // Fetch user's active challenges
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["streak-challenges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("streak_challenges")
        .select("*")
        .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
        .in("status", ["pending", "active", "completed"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch progress for active challenges
  const activeChallengeIds = challenges.filter((c: any) => c.status === "active").map((c: any) => c.id);
  const { data: progressData = [] } = useQuery({
    queryKey: ["streak-challenge-progress", activeChallengeIds],
    enabled: activeChallengeIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("streak_challenge_progress")
        .select("*")
        .in("challenge_id", activeChallengeIds);
      return data || [];
    },
  });

  const createChallenge = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const startDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { error } = await supabase.from("streak_challenges").insert({
        challenger_id: user.id,
        location_name: locationName,
        latitude,
        longitude,
        start_date: startDate,
        end_date: endDate,
        duration: 7,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Challenge created! Share the invite code with a friend.");
      queryClient.invalidateQueries({ queryKey: ["streak-challenges"] });
    } catch (error) {
      console.error("Error creating challenge:", error);
      toast.error("Failed to create challenge");
    } finally {
      setIsCreating(false);
    }
  };

  const joinChallenge = async () => {
    if (!user || !joinCode.trim()) return;
    try {
      // Find the challenge by invite code
      const { data: challenge, error: findError } = await supabase
        .from("streak_challenges")
        .select("*")
        .eq("invite_code", joinCode.trim())
        .eq("status", "pending")
        .maybeSingle();

      if (findError || !challenge) {
        toast.error("Challenge not found or already started");
        return;
      }

      if (challenge.challenger_id === user.id) {
        toast.error("You can't join your own challenge!");
        return;
      }

      // Join the challenge
      const { error } = await supabase
        .from("streak_challenges")
        .update({
          opponent_id: user.id,
          status: "active",
        })
        .eq("id", challenge.id);

      if (error) throw error;
      toast.success("You joined the challenge! 🎯");
      setJoinCode("");
      setShowJoin(false);
      queryClient.invalidateQueries({ queryKey: ["streak-challenges"] });
    } catch (error) {
      console.error("Error joining challenge:", error);
      toast.error("Failed to join challenge");
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  const getProgressForChallenge = (challengeId: string, userId: string) => {
    return progressData.filter((p: any) => p.challenge_id === challengeId && p.user_id === userId);
  };

  if (!user) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Streak Challenges
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">7-day</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={createChallenge}
            disabled={isCreating}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            New Challenge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJoin(!showJoin)}
            className="gap-1"
          >
            <Users className="w-4 h-4" />
            Join
          </Button>
        </div>

        {/* Join input */}
        {showJoin && (
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter invite code..."
              className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" onClick={joinChallenge}>Join</Button>
          </div>
        )}

        {/* Challenges list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No challenges yet. Challenge a friend to a 7-day prediction streak! 🏆
          </p>
        ) : (
          <div className="space-y-2">
            {challenges.map((challenge: any) => {
              const isChallenger = challenge.challenger_id === user.id;
              const daysTotal = challenge.duration;
              const daysPassed = challenge.status === "active"
                ? Math.min(daysTotal, differenceInDays(new Date(), new Date(challenge.start_date)) + 1)
                : 0;

              const myProgress = getProgressForChallenge(challenge.id, user.id);
              const opponentProgress = getProgressForChallenge(
                challenge.id,
                isChallenger ? challenge.opponent_id : challenge.challenger_id
              );

              const myScore = myProgress.reduce((sum: number, p: any) => sum + (p.accuracy_score || 0), 0);
              const oppScore = opponentProgress.reduce((sum: number, p: any) => sum + (p.accuracy_score || 0), 0);

              return (
                <div
                  key={challenge.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {challenge.status === "completed" ? (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <Swords className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{challenge.location_name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      challenge.status === "active" ? "bg-primary/10 text-primary" :
                      challenge.status === "pending" ? "bg-accent/50 text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {challenge.status}
                    </span>
                  </div>

                  {challenge.status === "pending" && isChallenger && challenge.invite_code && (
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background/50 px-2 py-1 rounded font-mono">
                        {challenge.invite_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteCode(challenge.invite_code)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground">Share this code</span>
                    </div>
                  )}

                  {challenge.status === "active" && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted/50 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${(daysPassed / daysTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Day {daysPassed}/{daysTotal}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>You: <strong>{Math.round(myScore)}pts</strong></span>
                        <span>Opponent: <strong>{Math.round(oppScore)}pts</strong></span>
                      </div>
                    </>
                  )}

                  {challenge.status === "completed" && (
                    <div className="text-center text-sm">
                      {challenge.winner_id === user.id ? (
                        <span className="text-primary font-medium">🏆 You won!</span>
                      ) : challenge.winner_id ? (
                        <span className="text-muted-foreground">Better luck next time!</span>
                      ) : (
                        <span className="text-muted-foreground">It's a tie!</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
