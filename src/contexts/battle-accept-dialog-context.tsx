import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WeatherPredictionForm } from "@/components/weather/weather-prediction-form";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Swords } from "lucide-react";

interface BattleAcceptDialogState {
  isOpen: boolean;
  isLoading: boolean;
  battleId: string | null;
  battleDetails: {
    locationName: string;
    latitude: number;
    longitude: number;
    battleDate: string;
  } | null;
}

interface BattleAcceptContextType {
  openBattleAcceptDialog: (battleId: string) => Promise<void>;
  closeBattleAcceptDialog: () => void;
}

const BattleAcceptContext = createContext<BattleAcceptContextType | null>(null);

export function useBattleAcceptDialog() {
  const context = useContext(BattleAcceptContext);
  if (!context) {
    throw new Error("useBattleAcceptDialog must be used within BattleAcceptDialogProvider");
  }
  return context;
}

interface BattleAcceptDialogProviderProps {
  children: ReactNode;
}

export function BattleAcceptDialogProvider({ children }: BattleAcceptDialogProviderProps) {
  const [state, setState] = useState<BattleAcceptDialogState>({
    isOpen: false,
    isLoading: false,
    battleId: null,
    battleDetails: null,
  });
  
  const { acceptBattle } = usePredictionBattles();
  const { toast } = useToast();

  const openBattleAcceptDialog = useCallback(async (battleId: string) => {
    // Open dialog immediately with loading state
    setState({
      isOpen: true,
      isLoading: true,
      battleId,
      battleDetails: null,
    });

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
        setState({
          isOpen: false,
          isLoading: false,
          battleId: null,
          battleDetails: null,
        });
        return;
      }

      if (battle.status !== "pending") {
        toast({
          title: "Challenge Unavailable",
          description: "This challenge has already been accepted or expired.",
          variant: "destructive",
        });
        setState({
          isOpen: false,
          isLoading: false,
          battleId: null,
          battleDetails: null,
        });
        return;
      }

      setState({
        isOpen: true,
        isLoading: false,
        battleId,
        battleDetails: {
          locationName: battle.location_name,
          latitude: battle.latitude,
          longitude: battle.longitude,
          battleDate: battle.battle_date,
        },
      });
    } catch (err) {
      console.error("Error fetching battle:", err);
      toast({
        title: "Error",
        description: "Failed to load battle details.",
        variant: "destructive",
      });
      setState({
        isOpen: false,
        isLoading: false,
        battleId: null,
        battleDetails: null,
      });
    }
  }, [toast]);

  const closeBattleAcceptDialog = useCallback(() => {
    setState({
      isOpen: false,
      isLoading: false,
      battleId: null,
      battleDetails: null,
    });
  }, []);

  const handlePredictionSubmit = async (predictionId?: string) => {
    if (!predictionId || !state.battleId) {
      toast({
        title: "Error",
        description: "No prediction ID received. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    const success = await acceptBattle(state.battleId, predictionId);
    if (success) {
      closeBattleAcceptDialog();
    }
  };

  return (
    <BattleAcceptContext.Provider value={{ openBattleAcceptDialog, closeBattleAcceptDialog }}>
      {children}
      
      {/* Global Battle Accept Dialog - rendered at root level so it's never unmounted by popover close */}
      <Dialog open={state.isOpen} onOpenChange={(open) => !open && closeBattleAcceptDialog()} modal={true}>
        <DialogContent 
          className="max-w-md z-[200]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Accept Battle Challenge
            </DialogTitle>
            {!state.isLoading && state.battleDetails && (
              <DialogDescription>
                Make your prediction for <strong>{state.battleDetails.locationName}</strong> to accept this battle.
              </DialogDescription>
            )}
          </DialogHeader>
          
          {state.isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading battle details...</p>
            </div>
          ) : state.battleDetails ? (
            <div className="space-y-4">
              <WeatherPredictionForm
                location={state.battleDetails.locationName}
                latitude={state.battleDetails.latitude}
                longitude={state.battleDetails.longitude}
                isImperial={false}
                onPredictionMade={handlePredictionSubmit}
                returnPredictionId={true}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-muted-foreground text-sm">Failed to load battle. Please close and try again.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </BattleAcceptContext.Provider>
  );
}
