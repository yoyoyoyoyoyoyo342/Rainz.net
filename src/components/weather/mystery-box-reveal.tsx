import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Snowflake, Crown, Zap, Coins, Star } from "lucide-react";
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
  shop_points: "from-amber-500/30 to-amber-600/10",
  streak_freeze: "from-blue-500/30 to-blue-600/10",
  premium_trial: "from-yellow-500/30 to-yellow-600/10",
  double_points: "from-purple-500/30 to-purple-600/10",
};

const rewardGlowColors = {
  shop_points: "shadow-amber-500/50",
  streak_freeze: "shadow-blue-500/50",
  premium_trial: "shadow-yellow-500/50",
  double_points: "shadow-purple-500/50",
};

export const MysteryBoxReveal = ({ isOpen, onClose, reward }: MysteryBoxRevealProps) => {
  const [phase, setPhase] = useState<"closed" | "shaking" | "opening" | "burst" | "revealed">("closed");
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; rotation: number; scale: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen && reward) {
      setPhase("closed");
      
      // Generate random particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);
      
      // Start animation sequence
      const timer1 = setTimeout(() => setPhase("shaking"), 200);
      const timer2 = setTimeout(() => setPhase("opening"), 1200);
      const timer3 = setTimeout(() => setPhase("burst"), 1800);
      const timer4 = setTimeout(() => {
        setPhase("revealed");
        // Trigger confetti with reward-themed colors
        const colors = reward.type === "shop_points" ? ['#F59E0B', '#D97706', '#FBBF24'] 
          : reward.type === "streak_freeze" ? ['#3B82F6', '#2563EB', '#60A5FA']
          : reward.type === "premium_trial" ? ['#EAB308', '#CA8A04', '#FDE047']
          : ['#A855F7', '#9333EA', '#C084FC'];
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
          colors,
        });
        
        // Second burst
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 120,
            origin: { y: 0.6, x: 0.3 },
            colors,
          });
          confetti({
            particleCount: 80,
            spread: 120,
            origin: { y: 0.6, x: 0.7 },
            colors,
          });
        }, 150);
      }, 2400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
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
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-b from-slate-900/95 to-slate-950/98 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center py-8 relative overflow-hidden">
          {/* Background glow effect */}
          <div className={`absolute inset-0 opacity-30 transition-opacity duration-1000 ${phase === "revealed" ? "opacity-50" : ""}`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl bg-gradient-to-r ${rewardBgColors[reward.type]}`} />
          </div>
          
          {/* Floating particles during opening */}
          {(phase === "opening" || phase === "burst") && particles.map((particle) => (
            <Star
              key={particle.id}
              className="absolute w-4 h-4 text-yellow-400 animate-ping"
              style={{
                top: `calc(50% + ${particle.y}px)`,
                left: `calc(50% + ${particle.x}px)`,
                transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
                animationDelay: `${particle.delay}s`,
                animationDuration: "0.8s",
              }}
            />
          ))}

          {/* Box Container */}
          <div className="relative z-10">
            {/* Closed/Shaking Box */}
            {(phase === "closed" || phase === "shaking") && (
              <div className="relative">
                {/* Box shadow/glow */}
                <div className={`absolute inset-0 rounded-2xl bg-pink-500/20 blur-xl transition-all duration-300 ${phase === "shaking" ? "scale-110 opacity-80" : "opacity-40"}`} />
                
                <div 
                  className={`
                    relative w-36 h-36 rounded-2xl 
                    bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 
                    flex items-center justify-center 
                    shadow-2xl shadow-pink-500/30
                    border-2 border-pink-400/40
                    transition-transform
                    ${phase === "shaking" ? "animate-[wiggle_0.1s_ease-in-out_infinite]" : ""}
                  `}
                >
                  {/* Box lid highlight */}
                  <div className="absolute top-0 left-2 right-2 h-8 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
                  
                  {/* Ribbon */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-b from-yellow-400 via-yellow-300 to-yellow-400 opacity-80" />
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 opacity-80" />
                  
                  {/* Bow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="relative">
                      <div className="absolute -left-6 -top-2 w-6 h-4 bg-yellow-400 rounded-full rotate-[-30deg]" />
                      <div className="absolute -right-6 -top-2 w-6 h-4 bg-yellow-400 rounded-full rotate-[30deg]" />
                      <div className="w-5 h-5 bg-yellow-500 rounded-full shadow-lg" />
                    </div>
                  </div>
                  
                  <Gift className="w-12 h-12 text-white/80 absolute bottom-4" />
                  
                  {/* Glow effect when shaking */}
                  {phase === "shaking" && (
                    <>
                      <div className="absolute inset-0 rounded-2xl bg-white/10 animate-pulse" />
                      <div className="absolute -inset-2 rounded-3xl border-2 border-white/20 animate-ping" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Opening Animation */}
            {phase === "opening" && (
              <div className="w-36 h-36 flex items-center justify-center relative">
                {/* Expanding rings */}
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border-4 border-yellow-400/60 animate-ping"
                    style={{
                      width: `${80 + i * 40}px`,
                      height: `${80 + i * 40}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: "1s",
                    }}
                  />
                ))}
                
                {/* Sparkle burst */}
                {[...Array(8)].map((_, i) => (
                  <Sparkles
                    key={i}
                    className="absolute w-6 h-6 text-yellow-400"
                    style={{
                      transform: `rotate(${i * 45}deg) translateY(-50px)`,
                      animation: "pulse 0.5s ease-in-out infinite",
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
                
                {/* Core glow */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white via-yellow-200 to-yellow-400 animate-pulse flex items-center justify-center shadow-2xl shadow-yellow-500/50">
                  <Sparkles className="w-12 h-12 text-yellow-600 animate-spin" />
                </div>
              </div>
            )}

            {/* Burst Animation */}
            {phase === "burst" && (
              <div className="w-36 h-36 flex items-center justify-center relative">
                {/* Explosion effect */}
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-50" />
                
                {/* Flying particles */}
                {particles.map((particle) => (
                  <div
                    key={particle.id}
                    className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500"
                    style={{
                      animation: "flyOut 0.6s ease-out forwards",
                      transform: `translate(${particle.x}px, ${particle.y}px)`,
                      animationDelay: `${particle.delay}s`,
                    }}
                  />
                ))}
                
                {/* Reveal core */}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${rewardBgColors[reward.type]} flex items-center justify-center animate-scale-in shadow-2xl ${rewardGlowColors[reward.type]}`}>
                  <Icon className={`w-10 h-10 ${rewardColors[reward.type]}`} />
                </div>
              </div>
            )}

            {/* Revealed Reward */}
            {phase === "revealed" && (
              <div className="animate-scale-in flex flex-col items-center gap-5">
                {/* Reward icon with glow */}
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-br ${rewardBgColors[reward.type]} scale-150 animate-pulse`} />
                  <div 
                    className={`
                      relative w-32 h-32 rounded-full 
                      bg-gradient-to-br ${rewardBgColors[reward.type]}
                      flex items-center justify-center 
                      border-4 border-white/20 
                      shadow-2xl ${rewardGlowColors[reward.type]}
                    `}
                  >
                    <Icon className={`w-16 h-16 ${rewardColors[reward.type]} drop-shadow-lg`} />
                  </div>
                  
                  {/* Orbiting sparkles */}
                  {[...Array(4)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className={`absolute w-5 h-5 ${rewardColors[reward.type]}`}
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${i * 90}deg) translateX(70px) translateY(-50%)`,
                        animation: "orbit 3s linear infinite",
                        animationDelay: `${i * 0.75}s`,
                      }}
                    />
                  ))}
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white animate-fade-in drop-shadow-lg">
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
              className="mt-8 animate-fade-in bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 shadow-lg shadow-purple-500/30"
              style={{ animationDelay: "0.3s" }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Awesome!
            </Button>
          )}

          {/* Instructions */}
          {phase !== "revealed" && (
            <p className="mt-8 text-white/50 text-sm animate-pulse z-10">
              {phase === "closed" ? "Opening mystery box..." : phase === "shaking" ? "Something's inside..." : "Revealing your reward..."}
            </p>
          )}
        </div>
        
        {/* Custom keyframes */}
        <style>{`
          @keyframes wiggle {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(-4px) rotate(-3deg); }
            75% { transform: translateX(4px) rotate(3deg); }
          }
          @keyframes flyOut {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx, 100px), var(--ty, -100px)) scale(0); opacity: 0; }
          }
          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(70px) translateY(-50%) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(70px) translateY(-50%) rotate(-360deg); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
