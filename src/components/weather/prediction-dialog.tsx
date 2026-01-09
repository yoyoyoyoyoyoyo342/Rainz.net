import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Trophy, Swords, CheckCircle, Calendar } from "lucide-react";
import { WeatherPredictionForm } from "./weather-prediction-form";
import { Leaderboard } from "./leaderboard";
import { PredictionBattles } from "./prediction-battles";
import { UserSearch } from "./user-search";
import { WeeklyChallenge } from "./weekly-challenge";
import { useLanguage } from "@/contexts/language-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { trackPredictionMade, trackEvent } from "@/lib/track-event";

interface PredictionDialogProps {
  location: string;
  latitude: number;
  longitude: number;
  isImperial: boolean;
  onPredictionMade: () => void;
}

interface ExistingPrediction {
  id: string;
  predicted_high: number;
  predicted_low: number;
  predicted_condition: string;
}

interface AcceptingBattle {
  id: string;
  date: string;
  challengerName: string;
}

export const PredictionDialog = ({
  location,
  latitude,
  longitude,
  isImperial,
  onPredictionMade
}: PredictionDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("predict");
  const [createBattleMode, setCreateBattleMode] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [acceptingBattle, setAcceptingBattle] = useState<AcceptingBattle | null>(null);
  const [existingPrediction, setExistingPrediction] = useState<ExistingPrediction | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const { t } = useLanguage();
  const { pendingChallenges, battles, createBattle, acceptBattle } = usePredictionBattles();

  // Check for existing prediction when accepting a battle
  useEffect(() => {
    const checkExistingPrediction = async () => {
      if (!acceptingBattle || !user) {
        setExistingPrediction(null);
        return;
      }

      setLoadingExisting(true);
      try {
        const { data } = await supabase
          .from("weather_predictions")
          .select("id, predicted_high, predicted_low, predicted_condition")
          .eq("user_id", user.id)
          .eq("prediction_date", acceptingBattle.date)
          .maybeSingle();

        setExistingPrediction(data);
      } catch (error) {
        console.error("Error checking existing prediction:", error);
      } finally {
        setLoadingExisting(false);
      }
    };

    checkExistingPrediction();
  }, [acceptingBattle, user]);

  const handlePredictionMade = async (predictionId?: string) => {
    // Track the prediction
    trackPredictionMade(location);

    // If accepting a battle, link the prediction to it
    if (acceptingBattle && predictionId) {
      await acceptBattle(acceptingBattle.id, predictionId);
      setAcceptingBattle(null);
      trackEvent('battle_joined', '/predictions');
    } else if (createBattleMode && predictionId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const battleDate = tomorrow.toISOString().split("T")[0];
      await createBattle(location, latitude, longitude, battleDate, predictionId, targetUser?.id);
      trackEvent('battle_created', '/predictions');
    }
    onPredictionMade();
    setOpen(false);
    setTargetUser(null);
    setCreateBattleMode(false);
    setAcceptingBattle(null);
    setExistingPrediction(null);
  };

  const handleAcceptBattle = (battleId: string) => {
    // Find the battle to get its date
    const battle = [...pendingChallenges, ...battles].find(b => b.id === battleId);
    if (battle) {
      setAcceptingBattle({
        id: battleId,
        date: battle.battle_date,
        challengerName: battle.challenger_name || "Unknown"
      });
    }
    setActiveTab("predict");
  };

  const handleUseExistingPrediction = async () => {
    if (!existingPrediction || !acceptingBattle) return;
    await acceptBattle(acceptingBattle.id, existingPrediction.id);
    setAcceptingBattle(null);
    setExistingPrediction(null);
    onPredictionMade();
    setOpen(false);
  };

  const handleSelectUser = (userId: string, displayName: string) => {
    setTargetUser({ id: userId, name: displayName });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setTargetUser(null);
        setCreateBattleMode(false);
        setAcceptingBattle(null);
        setExistingPrediction(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 px-4 text-sm sm:h-8 sm:px-3 sm:text-xs flex-1 sm:flex-initial relative">
          <Target className="w-4 h-4 sm:w-3 sm:h-3 mr-2 sm:mr-1" />
          Make Prediction
          {pendingChallenges.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground">
              {pendingChallenges.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Weather Challenge</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="predict" className="text-xs sm:text-sm">
              <Target className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Predict</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="battles" className="text-xs sm:text-sm relative">
              <Swords className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Battles</span>
              {pendingChallenges.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                  {pendingChallenges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs sm:text-sm">
              <Trophy className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Leaders</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="predict" className="mt-6">
            {acceptingBattle && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    <Swords className="w-4 h-4 inline mr-1" />
                    Accepting challenge from {acceptingBattle.challengerName}!
                  </p>
                </div>
                
                {loadingExisting ? (
                  <div className="text-sm text-muted-foreground">Checking for existing prediction...</div>
                ) : existingPrediction ? (
                  <Card className="p-4 bg-primary/10 border-primary/20">
                    <p className="text-sm font-medium mb-2">You already have a prediction for this date!</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      High: {existingPrediction.predicted_high}° | Low: {existingPrediction.predicted_low}° | {existingPrediction.predicted_condition}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUseExistingPrediction}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Use This Prediction
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setExistingPrediction(null)}>
                        Make New Prediction
                      </Button>
                    </div>
                  </Card>
                ) : null}
              </div>
            )}
            {!acceptingBattle && (
              <div className="mb-4 flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  <div>
                    <Label htmlFor="battle-mode" className="font-medium">Challenge Mode</Label>
                    <p className="text-xs text-muted-foreground">Challenge someone to a prediction battle</p>
                  </div>
                </div>
                <Switch
                  id="battle-mode"
                  checked={createBattleMode}
                  onCheckedChange={(checked) => {
                    setCreateBattleMode(checked);
                    if (!checked) setTargetUser(null);
                  }}
                />
              </div>
            )}
            {createBattleMode && !acceptingBattle && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <Swords className="w-4 h-4 inline mr-1" />
                    {targetUser 
                      ? `You're challenging ${targetUser.name}! Winner gets +50 bonus points!`
                      : "Search for a user to challenge, or leave empty for an open challenge anyone can accept."
                    }
                  </p>
                </div>
                <UserSearch
                  onSelectUser={handleSelectUser}
                  selectedUser={targetUser}
                  onClearSelection={() => setTargetUser(null)}
                />
              </div>
            )}
            {(!acceptingBattle || !existingPrediction) && (
              <WeatherPredictionForm
                location={location}
                latitude={latitude}
                longitude={longitude}
                onPredictionMade={handlePredictionMade}
                isImperial={isImperial}
                returnPredictionId={createBattleMode || !!acceptingBattle}
              />
            )}
          </TabsContent>
          
          <TabsContent value="weekly" className="mt-6">
            <WeeklyChallenge
              location={location}
              latitude={latitude}
              longitude={longitude}
              onMakePrediction={() => setActiveTab("predict")}
            />
          </TabsContent>
          
          <TabsContent value="battles" className="mt-6">
            <PredictionBattles
              location={location}
              latitude={latitude}
              longitude={longitude}
              onAcceptBattle={handleAcceptBattle}
            />
          </TabsContent>
          
          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
