import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  RotateCw, Sparkles, Gift, Snowflake, Zap, Coins, 
  Star, Clock, CheckCircle, Lock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface SpinReward {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  probability: number;
  type: "shop_points" | "streak_freeze" | "double_points" | "prediction_points" | "nothing";
  amount?: number;
}

const SPIN_REWARDS: SpinReward[] = [
  { 
    id: "sp_10", 
    label: "10 Shop Points", 
    shortLabel: "10 SP",
    color: "#f59e0b", 
    bgColor: "#fef3c7",
    icon: <Sparkles className="w-4 h-4" />,
    probability: 0.25,
    type: "shop_points",
    amount: 10
  },
  { 
    id: "sp_25", 
    label: "25 Shop Points", 
    shortLabel: "25 SP",
    color: "#f59e0b", 
    bgColor: "#fde68a",
    icon: <Sparkles className="w-4 h-4" />,
    probability: 0.15,
    type: "shop_points",
    amount: 25
  },
  { 
    id: "freeze", 
    label: "Streak Freeze", 
    shortLabel: "Freeze",
    color: "#3b82f6", 
    bgColor: "#dbeafe",
    icon: <Snowflake className="w-4 h-4" />,
    probability: 0.10,
    type: "streak_freeze",
    amount: 1
  },
  { 
    id: "double", 
    label: "Double Points (24h)", 
    shortLabel: "2x Pts",
    color: "#8b5cf6", 
    bgColor: "#ede9fe",
    icon: <Zap className="w-4 h-4" />,
    probability: 0.05,
    type: "double_points",
    amount: 1
  },
  { 
    id: "pp_50", 
    label: "50 Prediction Points", 
    shortLabel: "50 PP",
    color: "#06b6d4", 
    bgColor: "#cffafe",
    icon: <Coins className="w-4 h-4" />,
    probability: 0.20,
    type: "prediction_points",
    amount: 50
  },
  { 
    id: "pp_100", 
    label: "100 Prediction Points", 
    shortLabel: "100 PP",
    color: "#06b6d4", 
    bgColor: "#a5f3fc",
    icon: <Coins className="w-4 h-4" />,
    probability: 0.10,
    type: "prediction_points",
    amount: 100
  },
  { 
    id: "sp_50", 
    label: "50 Shop Points!", 
    shortLabel: "50 SP!",
    color: "#eab308", 
    bgColor: "#fef08a",
    icon: <Star className="w-4 h-4" />,
    probability: 0.05,
    type: "shop_points",
    amount: 50
  },
  { 
    id: "nothing", 
    label: "Try Again Tomorrow", 
    shortLabel: "🍀",
    color: "#6b7280", 
    bgColor: "#f3f4f6",
    icon: <Gift className="w-4 h-4" />,
    probability: 0.10,
    type: "nothing",
    amount: 0
  },
];

export const DailySpinWheel = () => {
  const { user } = useAuth();
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);
  const [loading, setLoading] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      checkTodaySpin();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkTodaySpin = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("daily_spins")
        .select("*")
        .eq("user_id", user.id)
        .eq("spin_date", today)
        .maybeSingle();
      
      setHasSpunToday(!!data);
    } catch (error) {
      console.error("Error checking spin:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectReward = (): SpinReward => {
    const random = Math.random();
    let cumulative = 0;
    
    for (const reward of SPIN_REWARDS) {
      cumulative += reward.probability;
      if (random < cumulative) {
        return reward;
      }
    }
    
    return SPIN_REWARDS[SPIN_REWARDS.length - 1];
  };

  const applyReward = async (reward: SpinReward) => {
    if (!user || reward.type === "nothing") return;

    try {
      if (reward.type === "shop_points") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("shop_points")
          .eq("user_id", user.id)
          .single();
        
        await supabase
          .from("profiles")
          .update({ shop_points: (profile?.shop_points || 0) + (reward.amount || 0) })
          .eq("user_id", user.id);
          
      } else if (reward.type === "prediction_points") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("user_id", user.id)
          .single();
        
        await supabase
          .from("profiles")
          .update({ total_points: (profile?.total_points || 0) + (reward.amount || 0) })
          .eq("user_id", user.id);
          
      } else if (reward.type === "streak_freeze") {
        // Check if inventory exists first
        const { data: inventory } = await supabase
          .from("user_inventory")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("item_type", "streak_freeze")
          .maybeSingle();
        
        if (inventory) {
          // Update existing
          await supabase
            .from("user_inventory")
            .update({ quantity: inventory.quantity + 1 })
            .eq("id", inventory.id);
        } else {
          // Insert new
          await supabase
            .from("user_inventory")
            .insert({
              user_id: user.id,
              item_type: "streak_freeze",
              quantity: 1,
            });
        }
          
      } else if (reward.type === "double_points") {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await supabase
          .from("active_powerups")
          .insert({
            user_id: user.id,
            powerup_type: "double_points",
            expires_at: expiresAt.toISOString(),
          });
      }
    } catch (error) {
      console.error("Error applying reward:", error);
    }
  };

  const spin = async () => {
    if (!user || isSpinning || hasSpunToday) return;

    setIsSpinning(true);
    const reward = selectReward();
    setWonReward(reward);

    // Calculate rotation to land on the reward
    const rewardIndex = SPIN_REWARDS.findIndex(r => r.id === reward.id);
    const segmentAngle = 360 / SPIN_REWARDS.length;
    const targetAngle = 360 - (rewardIndex * segmentAngle) - (segmentAngle / 2);
    const fullSpins = 5; // Number of full rotations
    const newRotation = rotation + (fullSpins * 360) + targetAngle + (Math.random() * 20 - 10);
    
    setRotation(newRotation);

    // Record the spin
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from("daily_spins").insert({
        user_id: user.id,
        spin_date: today,
        reward_type: reward.type,
        reward_amount: reward.amount || 0,
      });
    } catch (error) {
      console.error("Error recording spin:", error);
    }

    // Wait for spin animation to complete
    setTimeout(async () => {
      setIsSpinning(false);
      setHasSpunToday(true);
      
      // Apply the reward
      await applyReward(reward);
      
      // Show result and confetti
      setShowResult(true);
      
      if (reward.type !== "nothing") {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: [reward.color, "#ffd700", "#00ff88"],
        });
      }
    }, 4000);
  };

  const segmentAngle = 360 / SPIN_REWARDS.length;

  if (!user) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-4 text-center">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sign in for a free daily spin!</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <RotateCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Daily Spin
            {hasSpunToday && (
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Claimed
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="relative flex flex-col items-center">
            {/* Wheel Container */}
            <div className="relative w-48 h-48 mx-auto mb-4">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
              </div>
              
              {/* Wheel */}
              <div 
                ref={wheelRef}
                className="w-full h-full rounded-full border-4 border-primary/30 shadow-xl overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {SPIN_REWARDS.map((reward, index) => {
                    const startAngle = index * segmentAngle;
                    const endAngle = startAngle + segmentAngle;
                    const startRad = (startAngle - 90) * (Math.PI / 180);
                    const endRad = (endAngle - 90) * (Math.PI / 180);
                    
                    const x1 = 50 + 50 * Math.cos(startRad);
                    const y1 = 50 + 50 * Math.sin(startRad);
                    const x2 = 50 + 50 * Math.cos(endRad);
                    const y2 = 50 + 50 * Math.sin(endRad);
                    
                    const largeArc = segmentAngle > 180 ? 1 : 0;
                    
                    const textAngle = startAngle + segmentAngle / 2;
                    const textRad = (textAngle - 90) * (Math.PI / 180);
                    const textX = 50 + 32 * Math.cos(textRad);
                    const textY = 50 + 32 * Math.sin(textRad);
                    
                    return (
                      <g key={reward.id}>
                        <path
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={reward.bgColor}
                          stroke="white"
                          strokeWidth="0.5"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={reward.color}
                          fontSize="4.5"
                          fontWeight="bold"
                          transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                        >
                          {reward.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                  {/* Center circle */}
                  <circle cx="50" cy="50" r="8" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                  <circle cx="50" cy="50" r="5" fill="currentColor" className="text-primary" />
                </svg>
              </div>
            </div>

            {/* Spin Button */}
            <Button
              onClick={spin}
              disabled={hasSpunToday || isSpinning}
              className="w-full gap-2"
              variant={hasSpunToday ? "outline" : "default"}
            >
              {isSpinning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Spinning...
                </>
              ) : hasSpunToday ? (
                <>
                  <Clock className="w-4 h-4" />
                  Come back tomorrow!
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Spin for Free!
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {wonReward?.type === "nothing" ? "Better luck tomorrow!" : "🎉 You Won!"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: wonReward?.bgColor }}
            >
              <div style={{ color: wonReward?.color }} className="scale-150">
                {wonReward?.icon}
              </div>
            </div>
            <h3 className="text-xl font-bold text-center" style={{ color: wonReward?.color }}>
              {wonReward?.label}
            </h3>
            {wonReward?.type !== "nothing" && (
              <p className="text-sm text-muted-foreground mt-2">
                Added to your account!
              </p>
            )}
          </div>
          <Button onClick={() => setShowResult(false)} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Awesome!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
