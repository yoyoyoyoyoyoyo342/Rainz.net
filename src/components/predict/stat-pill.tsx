import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatPillProps {
  icon: LucideIcon;
  value: string | number;
  tone?: "primary" | "orange" | "yellow" | "green" | "red" | "violet";
  size?: "sm" | "md";
}

const toneMap = {
  primary: "bg-primary/15 border-primary/30 text-primary",
  orange: "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400",
  yellow: "bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  green: "bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400",
  red: "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400",
  violet: "bg-violet-500/15 border-violet-500/30 text-violet-600 dark:text-violet-400",
};

export function StatPill({ icon: Icon, value, tone = "primary", size = "sm" }: StatPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-bold",
        toneMap[tone],
        size === "sm" ? "px-2.5 py-1 text-sm" : "px-3 py-1.5 text-base"
      )}
    >
      <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>{value}</span>
    </div>
  );
}
