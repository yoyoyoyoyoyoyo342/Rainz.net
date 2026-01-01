import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gamepad2, Lock, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbeddedGame, GAME_URLS } from "./games/embedded-game";
import { GamesLeaderboard } from "./games-leaderboard";
import { useDailyGameLimit } from "@/hooks/use-daily-game-limit";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { trackGamePlayed, trackGameCompleted } from "@/lib/track-event";

interface GamesDialogProps {
  weatherCondition?: string;
}

type GameType = "snow" | "rain" | "cloud" | "lightning" | "wind" | "sun";

const GAME_INFO: Record<GameType, { name: string; emoji: string }> = {
  snow: { name: "Snow Skiing", emoji: "❄️" },
  rain: { name: "Rain Dodge", emoji: "🌧️" },
  cloud: { name: "Cloud Jump", emoji: "☁️" },
  lightning: { name: "Lightning Dodge", emoji: "⚡" },
  wind: { name: "Wind Surfer", emoji: "💨" },
  sun: { name: "Sunshine Collector", emoji: "☀️" },
};

function mapConditionToGame(condition?: string): GameType {
  if (!condition) return "sun";
  
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes("snow") || lowerCondition.includes("sleet") || lowerCondition.includes("blizzard") || lowerCondition.includes("flurr")) {
    return "snow";
  }
  if (lowerCondition.includes("thunder") || lowerCondition.includes("lightning") || lowerCondition.includes("storm")) {
    return "lightning";
  }
  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle") || lowerCondition.includes("shower")) {
    return "rain";
  }
  if (lowerCondition.includes("wind") || lowerCondition.includes("gust") || lowerCondition.includes("breezy")) {
    return "wind";
  }
  if (lowerCondition.includes("cloud") || lowerCondition.includes("overcast") || lowerCondition.includes("fog") || lowerCondition.includes("mist")) {
    return "cloud";
  }
  
  return "sun";
}

export function GamesDialog({ weatherCondition }: GamesDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { status, recordGamePlay } = useDailyGameLimit();
  const [gameCompleted, setGameCompleted] = useState(false);

  const currentGame = useMemo(() => mapConditionToGame(weatherCondition), [weatherCondition]);
  const gameInfo = GAME_INFO[currentGame];
  const gameConfig = GAME_URLS[currentGame];

  const handleGameEnd = async (score: number) => {
    // Track game play
    trackGamePlayed(gameInfo.name);

    if (!status.hasPlayedToday && !gameCompleted) {
      await recordGamePlay(score);
      setGameCompleted(true);
      trackGameCompleted(gameInfo.name, score);
      toast.success(`Game complete! You earned ${score} points!`);
    }
  };

  const isDisabled = status.hasPlayedToday || gameCompleted;

  const renderGame = () => {
    return (
      <EmbeddedGame
        gameUrl={gameConfig.url}
        gameName={`${gameInfo.emoji} ${gameInfo.name}`}
        fallbackUrl={gameConfig.fallback}
        onGameEnd={handleGameEnd}
        disabled={isDisabled}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 px-4 text-sm sm:h-8 sm:px-3 sm:text-xs flex-1 sm:flex-initial">
          <Gamepad2 className="w-4 h-4 sm:w-3 sm:h-3 mr-2 sm:mr-1" />
          Play {gameInfo.emoji} {gameInfo.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <span className="text-3xl">{gameInfo.emoji}</span>
            {gameInfo.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Today's weather: <span className="font-medium">{weatherCondition || "Clear"}</span>
          </p>
        </DialogHeader>

        {isDisabled && (
          <Card className="border-primary/30 bg-primary/10">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">You've played today!</p>
                <p className="text-sm text-muted-foreground">
                  Today's score: {status.todayScore || 0} points. Come back tomorrow!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="game" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="game" className="text-sm">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Play Game
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-sm">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="game">
            {renderGame()}
          </TabsContent>
          
          <TabsContent value="leaderboard">
            <GamesLeaderboard />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
