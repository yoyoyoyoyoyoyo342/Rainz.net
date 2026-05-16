import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassRowProps {
  accent?: "primary" | "green" | "red" | "amber" | "violet" | "gold" | "silver" | "bronze" | "none";
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

const accentMap = {
  primary: "before:bg-primary",
  green: "before:bg-green-500",
  red: "before:bg-red-500",
  amber: "before:bg-amber-500",
  violet: "before:bg-violet-500",
  gold: "before:bg-gradient-to-b before:from-yellow-300 before:to-yellow-600",
  silver: "before:bg-gradient-to-b before:from-gray-300 before:to-gray-500",
  bronze: "before:bg-gradient-to-b before:from-amber-500 before:to-amber-800",
  none: "before:bg-transparent",
};

export function GlassRow({
  accent = "none",
  highlight = false,
  onClick,
  className,
  children,
}: GlassRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "relative w-full text-left flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all",
        "bg-background/60 border-border/50 hover:bg-background/80 hover:border-border",
        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full",
        accentMap[accent],
        highlight && "ring-2 ring-primary/60 bg-primary/5",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      {children}
    </Comp>
  );
}
