import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { WeatherPredictionForm } from "@/components/weather/weather-prediction-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationBattleActionsProps {
  battleId: string;
  metadata: any;
  onActionComplete?: () => void;
}

export function NotificationBattleActions({ 
  battleId, 
  metadata,
  onActionComplete 
}: NotificationBattleActionsProps) {
  const { acceptBattle, declineBattle } = usePredictionBattles();
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  const [battleDetails, setBattleDetails] = useState<{
    locationName: string;
    latitude: number;
    longitude: number;
    battleDate: string;
  } | null>(null);

  const handleAcceptClick = async () => {
    setIsAccepting(true);
    
    try {
      // Fetch battle details
      const { data: battle, error } = await supabase
        .from("prediction_battles")
        .select("location_name, latitude, longitude, battle_date, status")
        .eq("id", battleId)
        .single();

      if (error || !battle) {
        toast({
          title: "Error",
          description: "Could not find this battle challenge.",
          variant: "destructive",
        });
        setIsAccepting(false);
        return;
      }

      if (battle.status !== "pending") {
        toast({
          title: "Challenge Unavailable",
          description: "This challenge has already been accepted or expired.",
          variant: "destructive",
        });
        setIsAccepting(false);
        onActionComplete?.();
        return;
      }

      // Store battle details and show prediction dialog
      setBattleDetails({
        locationName: battle.location_name,
        latitude: battle.latitude,
        longitude: battle.longitude,
        battleDate: battle.battle_date,
      });
      setShowPredictionDialog(true);
    } catch (err) {
      console.error("Error fetching battle:", err);
      toast({
        title: "Error",
        description: "Failed to load battle details.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineClick = async () => {
    setIsDeclining(true);
    try {
      await declineBattle(battleId);
      onActionComplete?.();
    } finally {
      setIsDeclining(false);
    }
  };

  const handlePredictionSubmit = async (predictionId: string) => {
    const success = await acceptBattle(battleId, predictionId);
    if (success) {
      setShowPredictionDialog(false);
      onActionComplete?.();
    }
  };

  return (
    <>
      <div className="flex gap-1.5 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={handleDeclineClick}
          disabled={isDeclining || isAccepting}
        >
          {isDeclining ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          Decline
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAcceptClick}
          disabled={isAccepting || isDeclining}
        >
          {isAccepting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3 mr-1" />
          )}
          Accept
        </Button>
      </div>

      {/* Battle Prediction Dialog */}
      <Dialog open={showPredictionDialog} onOpenChange={setShowPredictionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Battle Challenge</DialogTitle>
          </DialogHeader>
          {battleDetails && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Make your prediction for <strong>{battleDetails.locationName}</strong> to accept this battle.
              </p>
              <WeatherPredictionForm
                location={battleDetails.locationName}
                latitude={battleDetails.latitude}
                longitude={battleDetails.longitude}
                isImperial={false}
                onPredictionMade={handlePredictionSubmit}
                returnPredictionId={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
