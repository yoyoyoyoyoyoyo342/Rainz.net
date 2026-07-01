import { motion } from "framer-motion";
import { Dice5, Flame, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TIERS = [
  { label: "Safe", mult: "1x", desc: "Chill points, no risk", icon: TrendingUp, color: "text-blue-500" },
  { label: "Bold", mult: "1.5x", desc: "Some spice, some sizzle", icon: Flame, color: "text-amber-500" },
  { label: "All-In", mult: "2.5x", desc: "Big win or big oof", icon: Dice5, color: "text-rose-500" },
];

export function WildCardHype() {
  return (
    <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-background">
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <CardContent className="relative p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
          <Dice5 className="w-3.5 h-3.5" />
          Feeling lucky?
        </div>
        <p className="text-sm font-semibold mt-1 leading-snug">
          Crank the confidence dial. Bigger risk, bigger glory.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {TIERS.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, type: "spring", stiffness: 220, damping: 18 }}
                className="rounded-xl border border-border/50 bg-background/60 backdrop-blur p-2 text-center"
              >
                <Icon className={`w-4 h-4 mx-auto ${t.color}`} />
                <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-muted-foreground">
                  {t.label}
                </div>
                <div className="text-lg font-black leading-none">{t.mult}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
