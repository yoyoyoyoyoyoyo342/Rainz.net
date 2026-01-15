import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Snowflake, Crown, Zap, Coins } from "lucide-react";
import confetti from "canvas-confetti";

interface MysteryBoxReward {
  type: "shop_points" | "streak_freeze" | "premium_trial" | "double_points";
  amount?: number;
  label: string;
  description: string;
}

interface MysteryBoxRevealProps {
  isOpen: boolean;
  onClose: () => void;
  reward: MysteryBoxReward | null;
}

const rewardIcons = {
  shop_points: Coins,
  streak_freeze: Snowflake,
  premium_trial: Crown,
  double_points: Zap,
};

const rewardColors = {
  shop_points: "text-amber-400",
  streak_freeze: "text-blue-400",
  premium_trial: "text-yellow-400",
  double_points: "text-purple-400",
};

const rewardBgColors = {
  shop_points: "from-amber-500/20 to-amber-500/5",
  streak_freeze: "from-blue-500/20 to-blue-500/5",
  premium_trial: "from-yellow-500/20 to-yellow-500/5",
  double_points: "from-purple-500/20 to-purple-500/5",
};

export const MysteryBoxReveal = ({ isOpen, onClose, reward }: MysteryBoxRevealProps) => {
  const [phase, setPhase] = useState<"closed" | "shaking" | "opening" | "revealed">("closed");

  useEffect(() => {
    if (isOpen && reward) {
      setPhase("closed");
      
      // Start animation sequence
      const timer1 = setTimeout(() => setPhase("shaking"), 300);
      const timer2 = setTimeout(() => setPhase("opening"), 1500);
      const timer3 = setTimeout(() => {
        setPhase("revealed");
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#9370DB'],
        });
      }, 2200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen, reward]);

  const handleClose = () => {
    setPhase("closed");
    onClose();
  };

  if (!reward) return null;

  const Icon = rewardIcons[reward.type];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none">
        <div className="flex flex-col items-center justify-center py-8">
          {/* Box Container */}
          <div className="relative">
            {/* Closed/Shaking Box */}
            {(phase === "closed" || phase === "shaking") && (
              <div 
                className={`
                  w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 
                  flex items-center justify-center shadow-2xl border-4 border-pink-400/50
                  ${phase === "shaking" ? "animate-[shake_0.5s_ease-in-out_infinite]" : ""}
                `}
                style={{
                  animation: phase === "shaking" 
                    ? "shake 0.15s ease-in-out infinite, pulse 0.3s ease-in-out infinite" 
                    : undefined
                }}
              >
                <Gift className="w-16 h-16 text-white" />
                
                {/* Glow effect */}
                {phase === "shaking" && (
                  <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
                )}
              </div>
            )}

            {/* Opening Animation */}
            {phase === "opening" && (
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(8)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className="absolute w-8 h-8 text-yellow-400 animate-ping"
                      style={{
                        transform: `rotate(${i * 45}deg) translateY(-40px)`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="w-20 h-20 rounded-full bg-white animate-scale-in flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-yellow-500 animate-spin" />
                </div>
              </div>
            )}

            {/* Revealed Reward */}
            {phase === "revealed" && (
              <div className="animate-scale-in flex flex-col items-center gap-4">
                <div 
                  className={`
                    w-28 h-28 rounded-full bg-gradient-to-br ${rewardBgColors[reward.type]}
                    flex items-center justify-center border-4 border-white/20 shadow-2xl
                  `}
                >
                  <Icon className={`w-14 h-14 ${rewardColors[reward.type]}`} />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white animate-fade-in">
                    {reward.label}
                  </h3>
                  <p className="text-white/70 text-sm animate-fade-in" style={{ animationDelay: "0.1s" }}>
                    {reward.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          {phase === "revealed" && (
            <Button 
              onClick={handleClose}
              className="mt-8 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Awesome!
            </Button>
          )}

          {/* Instructions */}
          {phase !== "revealed" && (
            <p className="mt-6 text-white/50 text-sm animate-pulse">
              {phase === "closed" ? "Opening mystery box..." : "Revealing your reward..."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add keyframes to global CSS or here as inline styles
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-5px) rotate(-5deg); }
  75% { transform: translateX(5px) rotate(5deg); }
}
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shakeKeyframes;
  document.head.appendChild(style);
}
