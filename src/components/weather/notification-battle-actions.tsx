import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { usePredictionBattles } from "@/hooks/use-prediction-battles";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAcceptClick = async () => {
    setIsAccepting(true);
    
    try {
      // Delete the notification
      if (metadata?.battle_id) {
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
      
      // Close popover and navigate to weather page with battle param
      onRequestCloseParent?.();
      onActionComplete?.();
      navigate(`/?accept_battle=${battleId}`);
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
