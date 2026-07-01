import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Zap } from "lucide-react";
import { RejnMascot } from "@/components/rejn/rejn-mascot";

interface PredictionCelebrationProps {
  trigger: number; // increment to fire
  streak?: number;
}

const HYPE_LINES = [
  "Prediction locked in! 🔒 Rejn is impressed.",
  "Ohh spicy call — let's see how it lands. 🌶️",
  "Sent to the weather gods. 🙏",
  "Boldly forecasted. The atmosphere is nervous. 😤",
  "That's a prediction with attitude. 💅",
  "Confidence noted. Rejn approves. 🐾",
  "Weather? Handled. 🎯",
  "The forecast has been vibed. ✨",
];

const STREAK_LINES: Record<number, string> = {
  3: "🔥 3 in a row — you're heating up!",
  5: "🔥🔥 5-streak! Meteorologists are sweating.",
  7: "👑 A full week?! Rejn is bowing.",
  10: "🚀 DOUBLE DIGITS. Absolute weather wizard.",
};

export function PredictionCelebration({ trigger, streak = 0 }: PredictionCelebrationProps) {
  const [show, setShow] = useState(false);
  const [line, setLine] = useState("");

  useEffect(() => {
    if (trigger === 0) return;

    const streakLine = STREAK_LINES[streak + 1] || STREAK_LINES[streak];
    setLine(streakLine || HYPE_LINES[Math.floor(Math.random() * HYPE_LINES.length)]);
    setShow(true);

    // Multi-burst confetti
    const end = Date.now() + 900;
    const colors = ["#3b82f6", "#60a5fa", "#f59e0b", "#22c55e", "#ec4899"];
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
        scalar: 0.9,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
        scalar: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.55 },
      colors,
      scalar: 1.1,
    });

    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [trigger, streak]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center px-6"
        >
          <motion.div
            initial={{ scale: 0.6, y: 40, rotate: -6 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative max-w-sm w-full rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-blue-600 p-6 shadow-2xl text-white overflow-hidden"
          >
            <motion.div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/20 blur-2xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <div className="relative flex items-start gap-3">
              <div className="shrink-0">
                <RejnMascot pose="dance" className="w-16 h-16" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-90">
                  <Sparkles className="w-3.5 h-3.5" />
                  Locked in
                </div>
                <p className="text-lg font-bold leading-snug mt-1">{line}</p>
                {streak > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                    <Zap className="w-3.5 h-3.5" />
                    {streak + 1}-day streak brewing
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
