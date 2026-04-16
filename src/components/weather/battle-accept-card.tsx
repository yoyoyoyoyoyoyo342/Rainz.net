import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, Loader2, X } from "lucide-react";
import { WeatherPredictionForm } from "@/components/weather/weather-prediction-form";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface BattleAcceptCardProps {
  battleId: string;
  isImperial: boolean;
  onComplete: () => void;
}

export function BattleAcceptCard({ battleId, isImperial, onComplete }: BattleAcceptCardProps) {
  const { acceptBattle } = usePredictionBattles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedBattleId, setResolvedBattleId] = useState<string | null>(null);
  const [battleDetails, setBattleDetails] = useState<{
    locationName: string;
    latitude: number;
    longitude: number;
    battleDate: string;
  } | null>(null);

  useEffect(() => {
    const fetchBattle = async () => {
      try {
        const { data: battle, error } = await supabase
          .from("prediction_battles")
          .select("id, challenger_id, opponent_id, location_name, latitude, longitude, battle_date, status, created_at")
          .eq("id", battleId)
          .maybeSingle();

        if (error || !battle) {
          toast({ title: "Error", description: "Could not find this battle challenge.", variant: "destructive" });
          onComplete();
          return;
        }

        let actionableBattle =
          battle.status === "pending" && (!battle.opponent_id || battle.opponent_id === user?.id)
            ? battle
            : null;

        if (!actionableBattle && user?.id) {
          const { data: replacementBattle } = await supabase
            .from("prediction_battles")
            .select("id, opponent_id, location_name, latitude, longitude, battle_date, status")
            .eq("status", "pending")
            .eq("opponent_id", user.id)
            .eq("challenger_id", battle.challenger_id)
            .eq("location_name", battle.location_name)
            .eq("battle_date", battle.battle_date)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          actionableBattle = replacementBattle ?? null;
        }

        if (!actionableBattle) {
          toast({ title: "Challenge Unavailable", description: "This challenge has already been accepted or expired.", variant: "destructive" });
          onComplete();
          return;
        }

        setResolvedBattleId(actionableBattle.id);
        setBattleDetails({
          locationName: actionableBattle.location_name,
          latitude: actionableBattle.latitude,
          longitude: actionableBattle.longitude,
          battleDate: actionableBattle.battle_date,
        });
      } catch (err) {
        console.error("Error fetching battle:", err);
        toast({ title: "Error", description: "Failed to load battle details.", variant: "destructive" });
        onComplete();
      } finally {
        setIsLoading(false);
      }
    };

    fetchBattle();
  }, [battleId, onComplete, toast, user?.id]);

  const handlePredictionSubmit = async (predictionId?: string) => {
    if (!predictionId) {
      toast({ title: "Error", description: "No prediction ID received. Please try again.", variant: "destructive" });
      return;
    }

    const success = await acceptBattle(resolvedBattleId ?? battleId, predictionId);
    if (success) {
      onComplete();
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6 border-2 border-primary/40 bg-primary/5 rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading battle details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!battleDetails) return null;

  return (
    <Card className="mb-6 border-2 border-primary/40 bg-primary/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-primary/10">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Accept Battle Challenge</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onComplete}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Make your prediction for <strong className="text-foreground">{battleDetails.locationName}</strong> to accept this battle.
        </p>
        <WeatherPredictionForm
          location={battleDetails.locationName}
          latitude={battleDetails.latitude}
          longitude={battleDetails.longitude}
          isImperial={isImperial}
          onPredictionMade={handlePredictionSubmit}
          returnPredictionId={true}
        />
      </CardContent>
    </Card>
  );
}
