import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PredictHeroProps {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  pills?: ReactNode;
  footer?: ReactNode;
  className?: string;
  gradient?: "primary" | "amber" | "rose" | "violet";
}

const gradientMap = {
  primary: "from-primary/15 via-primary/5 to-background border-primary/30",
  amber: "from-amber-500/15 via-amber-500/5 to-background border-amber-500/30",
  rose: "from-rose-500/15 via-rose-500/5 to-background border-rose-500/30",
  violet: "from-violet-500/15 via-violet-500/5 to-background border-violet-500/30",
};

const orbMap = {
  primary: "bg-primary/20",
  amber: "bg-amber-500/20",
  rose: "bg-rose-500/20",
  violet: "bg-violet-500/20",
};

export function PredictHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  subtitle,
  pills,
  footer,
  className,
  gradient = "primary",
}: PredictHeroProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        gradientMap[gradient],
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none",
          orbMap[gradient]
        )}
      />
      <CardContent className="relative p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                {EyebrowIcon && <EyebrowIcon className="w-3.5 h-3.5" />}
                {eyebrow}
              </div>
            )}
            <h1 className="text-2xl font-bold mt-1 truncate">{title}</h1>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
            )}
          </div>
          {pills && <div className="flex flex-col items-end gap-1.5 shrink-0">{pills}</div>}
        </div>
        {footer && (
          <div className="pt-2 border-t border-border/40">{footer}</div>
        )}
      </CardContent>
    </Card>
  );
}
