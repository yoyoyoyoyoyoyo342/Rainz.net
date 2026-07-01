import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RejnMascot } from "@/components/rejn/rejn-mascot";

interface RejnCommentaryProps {
  streak?: number;
  accuracy?: number;
  totalPredictions?: number;
}

function pickLine(streak: number, accuracy: number, total: number) {
  if (total === 0) {
    return {
      pose: "wave" as const,
      title: "First prediction? Let's goooo.",
      sub: "Pro tip: pick a confidence you can defend at brunch.",
    };
  }
  if (streak >= 7) {
    return {
      pose: "dance" as const,
      title: `🔥 ${streak}-day streak — you're on fire!`,
      sub: "Don't break it now. Rejn is watching. 👀",
    };
  }
  if (streak >= 3) {
    return {
      pose: "pounce" as const,
      title: `${streak}-in-a-row and climbing.`,
      sub: "One more and the multiplier gets juicy. 🧃",
    };
  }
  if (accuracy >= 70) {
    return {
      pose: "dance" as const,
      title: `${accuracy}% accuracy?! Suspicious. 🕵️`,
      sub: "The Meteorological Institute called. They're jealous.",
    };
  }
  if (accuracy < 30 && total > 5) {
    return {
      pose: "sit" as const,
      title: "Rough patch. It happens to the best of us.",
      sub: "Play a low-confidence hand and rebuild. 💪",
    };
  }
  return {
    pose: "wave" as const,
    title: "Tomorrow's weather is up for grabs.",
    sub: "Bold predictions earn bragging rights.",
  };
}

export function RejnCommentary({ streak = 0, accuracy = 0, totalPredictions = 0 }: RejnCommentaryProps) {
  const line = useMemo(
    () => pickLine(streak, accuracy, totalPredictions),
    [streak, accuracy, totalPredictions]
  );

  return (
    <Card className="glass-card border-primary/20 overflow-hidden">
      <CardContent className="p-3 flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="shrink-0"
        >
          <RejnMascot pose={line.pose} className="w-12 h-12" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{line.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{line.sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
