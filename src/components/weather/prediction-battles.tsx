import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Swords, Trophy, Clock, CheckCircle, XCircle, Users, Timer } from "lucide-react";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface PredictionBattlesProps {
  location: string;
  latitude: number;
  longitude: number;
  onAcceptBattle?: (battleId: string) => void;
}

// Helper function to calculate time until midnight
const getTimeUntilExpiry = (createdAt: string) => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  
  const hoursLeft = differenceInHours(midnight, now);
  const minutesLeft = differenceInMinutes(midnight, now) % 60;
  
  if (hoursLeft > 0) {
    return `${hoursLeft}h ${minutesLeft}m`;
  } else if (minutesLeft > 0) {
    return `${minutesLeft}m`;
  }
  return "< 1m";
};

export const PredictionBattles = ({
  location,
  latitude,
  longitude,
  onAcceptBattle,
}: PredictionBattlesProps) => {
  const { battles, pendingChallenges, loading, acceptBattle, declineBattle, getOpenBattles } =
    usePredictionBattles();
  const [openBattles, setOpenBattles] = useState<any[]>([]);
  const [loadingOpen, setLoadingOpen] = useState(true);
  const [, forceUpdate] = useState(0);

  const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  useEffect(() => {
    const fetchOpen = async () => {
      setLoadingOpen(true);
      const open = await getOpenBattles(location, tomorrow);
      setOpenBattles(open);
      setLoadingOpen(false);
    };
    fetchOpen();
  }, [location]);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="default"><Swords className="w-3 h-3 mr-1" />Active</Badge>;
      case "completed":
        return <Badge variant="outline"><Trophy className="w-3 h-3 mr-1" />Completed</Badge>;
      case "declined":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case "expired":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Open Challenges to Accept */}
      {openBattles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Open Challenges for {location}
          </h4>
          <div className="space-y-2">
            {openBattles.map((battle) => (
              <Card key={battle.id} className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{battle.challenger_name}</p>
                      <p className="text-sm text-muted-foreground">
                        wants to battle for {format(new Date(battle.battle_date), "MMM d")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-primary">
                          +{battle.bonus_points} bonus points for winner!
                        </p>
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Timer className="w-3 h-3" />
                          Expires in {getTimeUntilExpiry(battle.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAcceptBattle?.(battle.id)}
                    >
                      <Swords className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Challenges Received */}
      {pendingChallenges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-yellow-500" />
            Challenges Received
          </h4>
          <div className="space-y-2">
            {pendingChallenges.map((battle) => (
              <Card key={battle.id} className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{battle.challenger_name} challenged you!</p>
                      <p className="text-sm text-muted-foreground">
                        {battle.location_name} • {format(new Date(battle.battle_date), "MMM d")}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                        <Timer className="w-3 h-3" />
                        Expires in {getTimeUntilExpiry(battle.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineBattle(battle.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onAcceptBattle?.(battle.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Battle History */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Your Battles
        </h4>
        {battles.length === 0 ? (
          <Card className="bg-background/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No battles yet. Make a prediction and challenge others!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {battles.slice(0, 5).map((battle) => (
              <Card key={battle.id} className="bg-background/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {battle.challenger_name} vs {battle.opponent_name}
                        </p>
                        {getStatusBadge(battle.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {battle.location_name} • {format(new Date(battle.battle_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {battle.status === "completed" && battle.winner_id && (
                      <div className="text-right">
                        <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                        <p className="text-xs text-muted-foreground">
                          +{battle.bonus_points} pts
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
