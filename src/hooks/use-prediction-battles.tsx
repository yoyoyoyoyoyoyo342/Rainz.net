import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_prediction_id: string | null;
  opponent_prediction_id: string | null;
  location_name: string;
  latitude: number;
  longitude: number;
  battle_date: string;
  status: string;
  winner_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  bonus_points: number;
  created_at: string;
  challenger_name?: string;
  opponent_name?: string;
}

export const usePredictionBattles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBattles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("prediction_battles")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch display names for battles
      const battlesWithNames = await Promise.all(
        (data || []).map(async (battle) => {
          const [challengerProfile, opponentProfile] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", battle.challenger_id)
              .maybeSingle(),
            battle.opponent_id
              ? supabase
                  .from("profiles")
                  .select("display_name")
                  .eq("user_id", battle.opponent_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...battle,
            challenger_name: challengerProfile.data?.display_name || "Unknown",
            opponent_name: opponentProfile.data?.display_name || "Waiting...",
          };
        })
      );

      setBattles(battlesWithNames);
      
      // Get today at midnight for expiration check
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter pending challenges - exclude expired ones (created before today)
      setPendingChallenges(
        battlesWithNames.filter((b) => {
          if (b.status !== "pending" || b.opponent_id !== user.id) return false;
          
          const createdAt = new Date(b.created_at);
          createdAt.setHours(0, 0, 0, 0);
          return createdAt >= today; // Only include challenges from today
        })
      );
    } catch (error) {
      console.error("Error fetching battles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
  }, [user]);

  const createBattle = async (
    locationName: string,
    latitude: number,
    longitude: number,
    battleDate: string,
    predictionId: string,
    targetOpponentId?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("prediction_battles")
        .insert({
          challenger_id: user.id,
          opponent_id: targetOpponentId || null,
          location_name: locationName,
          latitude,
          longitude,
          battle_date: battleDate,
          challenger_prediction_id: predictionId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Get challenger's display name for the notification
      const { data: challengerProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const challengerName = challengerProfile?.display_name || "Someone";

      // If targeting a specific opponent, send them a notification
      if (targetOpponentId) {
        await supabase.from("user_notifications").insert({
          user_id: targetOpponentId,
          type: "battle_challenge",
          title: "New Battle Challenge!",
          message: `${challengerName} challenged you to a weather prediction battle for ${locationName}!`,
          metadata: { battle_id: data.id, challenger_name: challengerName, location: locationName },
        });
      }

      toast({
        title: "Battle Created!",
        description: targetOpponentId 
          ? "Challenge sent! They'll be notified."
          : "Your challenge is now open for others to accept.",
      });

      await fetchBattles();
      return data;
    } catch (error) {
      console.error("Error creating battle:", error);
      toast({
        title: "Error",
        description: "Failed to create battle challenge.",
        variant: "destructive",
      });
      return null;
    }
  };

  const acceptBattle = async (battleId: string, predictionId: string) => {
    if (!user) return false;

    try {
      // Get battle info first
      const { data: battle } = await supabase
        .from("prediction_battles")
        .select("challenger_id, location_name, created_at, status")
        .eq("id", battleId)
        .single();

      // Check if battle has expired (created before today at midnight)
      if (battle) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const createdAt = new Date(battle.created_at);
        createdAt.setHours(0, 0, 0, 0);
        
        if (createdAt < today) {
          // Mark as expired
          await supabase
            .from("prediction_battles")
            .update({ status: "expired" })
            .eq("id", battleId);
          
          toast({
            title: "Challenge Expired",
            description: "This challenge has expired. Battles must be accepted on the same day they're created.",
            variant: "destructive",
          });
          await fetchBattles();
          return false;
        }
      }

      const { error } = await supabase
        .from("prediction_battles")
        .update({
          opponent_id: user.id,
          opponent_prediction_id: predictionId,
          status: "accepted",
        })
        .eq("id", battleId);

      if (error) throw error;

      // Get accepter's display name
      const { data: accepterProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const accepterName = accepterProfile?.display_name || "Someone";

      // Notify the challenger that their battle was accepted
      if (battle?.challenger_id) {
        await supabase.from("user_notifications").insert({
          user_id: battle.challenger_id,
          type: "battle_accepted",
          title: "Challenge Accepted!",
          message: `${accepterName} accepted your weather battle challenge for ${battle.location_name}!`,
          metadata: { battle_id: battleId, opponent_name: accepterName },
        });
      }

      toast({
        title: "Challenge Accepted!",
        description: "May the best predictor win!",
      });

      await fetchBattles();
      return true;
    } catch (error) {
      console.error("Error accepting battle:", error);
      toast({
        title: "Error",
        description: "Failed to accept challenge.",
        variant: "destructive",
      });
      return false;
    }
  };

  const declineBattle = async (battleId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("prediction_battles")
        .update({ status: "declined" })
        .eq("id", battleId);

      if (error) throw error;

      toast({
        title: "Challenge Declined",
        description: "The challenge has been declined.",
      });

      await fetchBattles();
      return true;
    } catch (error) {
      console.error("Error declining battle:", error);
      return false;
    }
  };

  const getOpenBattles = async (locationName: string, battleDate: string) => {
    try {
      const { data, error } = await supabase
        .from("prediction_battles")
        .select("*")
        .eq("location_name", locationName)
        .eq("battle_date", battleDate)
        .eq("status", "pending")
        .is("opponent_id", null);

      if (error) throw error;

      // Get current time for expiration check (battles expire at midnight of the day they were created)
      const now = new Date();

      // Filter out user's own battles, expired battles, and add names
      const filteredBattles = (data || []).filter((b) => {
        if (b.challenger_id === user?.id) return false;
        
        // Check if battle has expired (past midnight of creation day)
        const createdAt = new Date(b.created_at);
        const expiryTime = new Date(createdAt);
        expiryTime.setHours(23, 59, 59, 999); // End of the day it was created
        
        if (now > expiryTime) {
          // Mark as expired in the background
          supabase
            .from("prediction_battles")
            .update({ status: "expired" })
            .eq("id", b.id)
            .then(() => {});
          return false;
        }
        
        return true;
      });

      const battlesWithNames = await Promise.all(
        filteredBattles.map(async (battle) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", battle.challenger_id)
            .maybeSingle();

          return {
            ...battle,
            challenger_name: profile?.display_name || "Unknown",
          };
        })
      );

      return battlesWithNames;
    } catch (error) {
      console.error("Error fetching open battles:", error);
      return [];
    }
  };
  
  // Auto-expire pending battles that are past midnight
  const expireOldBattles = async () => {
    if (!user) return;
    
    const now = new Date();
    
    // Get all pending battles
    const { data: pendingBattles } = await supabase
      .from("prediction_battles")
      .select("id, created_at")
      .eq("status", "pending");
    
    if (!pendingBattles) return;
    
    for (const battle of pendingBattles) {
      const createdAt = new Date(battle.created_at);
      const expiryTime = new Date(createdAt);
      expiryTime.setHours(23, 59, 59, 999);
      
      if (now > expiryTime) {
        await supabase
          .from("prediction_battles")
          .update({ status: "expired" })
          .eq("id", battle.id);
      }
    }
  };
  
  // Run expiry check on mount
  useEffect(() => {
    expireOldBattles();
  }, [user]);

  return {
    battles,
    pendingChallenges,
    loading,
    createBattle,
    acceptBattle,
    declineBattle,
    getOpenBattles,
    refetch: fetchBattles,
  };
};
