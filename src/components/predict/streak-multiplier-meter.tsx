import { Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakMultiplierMeterProps {
  streak: number;
  className?: string;
}

const TIERS = [
  { at: 0, bonus: 0, label: "Warm-up" },
  { at: 3, bonus: 10, label: "Hot" },
  { at: 7, bonus: 25, label: "Blazing" },
  { at: 14, bonus: 50, label: "Inferno" },
  { at: 30, bonus: 100, label: "Legendary" },
];

export function getStreakBonus(streak: number): number {
  let bonus = 0;
  for (const t of TIERS) if (streak >= t.at) bonus = t.bonus;
  return bonus;
}

export function StreakMultiplierMeter({ streak, className }: StreakMultiplierMeterProps) {
  const current = TIERS.reduce((acc, t) => (streak >= t.at ? t : acc), TIERS[0]);
  const next = TIERS.find(t => t.at > streak);
  const start = current.at;
  const end = next?.at ?? current.at + 1;
  const progress = next ? Math.min(100, Math.max(0, ((streak - start) / (end - start)) * 100)) : 100;

  return (
    <div className={cn("rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-rose-500/5 to-amber-500/10 p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Flame className="w-4 h-4 text-orange-500" />
            {streak >= 7 && <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-yellow-400" />}
          </div>
          <span className="text-xs font-bold">
            {current.label} • <span className="text-orange-600 dark:text-orange-400">+{current.bonus}%</span>
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {next ? `${end - streak} to ${next.label} (+${next.bonus}%)` : "MAX TIER"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-background/60 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
        {TIERS.map(t => (
          <span key={t.at} className={cn("font-semibold", streak >= t.at && "text-orange-500")}>
            {t.at}d
          </span>
        ))}
      </div>
    </div>
  );
}
