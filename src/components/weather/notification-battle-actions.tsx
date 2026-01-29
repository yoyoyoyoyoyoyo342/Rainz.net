import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
import { useBattleAcceptDialog } from "@/contexts/battle-accept-dialog-context";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationBattleActionsProps {
  battleId: string;
  metadata: any;
  onActionComplete?: () => void;
  onRequestCloseParent?: () => void;
}

export function NotificationBattleActions({ 
  battleId, 
  metadata,
  onActionComplete,
  onRequestCloseParent,
}: NotificationBattleActionsProps) {
  const { declineBattle } = usePredictionBattles();
  const { openBattleAcceptDialog } = useBattleAcceptDialog();
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAcceptClick = async () => {
    setIsAccepting(true);
    
    try {
      // First dismiss the notification permanently
      if (metadata?.battle_id) {
        // Find and delete the notification for this battle
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user?.id) {
          await supabase
            .from("user_notifications")
            .delete()
            .eq("user_id", session.session.user.id)
            .eq("type", "battle_challenge")
            .contains("metadata", { battle_id: battleId });
        }
      }
      
      // Close the inbox popover FIRST
      onRequestCloseParent?.();
      onActionComplete?.();
      
      // Then open the global battle accept dialog (after popover is closed)
      // Use setTimeout to ensure popover closes before dialog opens
      setTimeout(() => {
        openBattleAcceptDialog(battleId);
      }, 100);
    } catch (err) {
      console.error("Error accepting battle:", err);
      toast({
        title: "Error",
        description: "Failed to accept battle. Please try again.",
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
      onRequestCloseParent?.();
      onActionComplete?.();
    } finally {
      setIsDeclining(false);
    }
  };

  return (
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
  );
}
