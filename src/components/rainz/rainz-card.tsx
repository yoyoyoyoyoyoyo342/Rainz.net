import React from "react";
import { cn } from "@/lib/utils";

// Rainz 2.0 — unified glass card primitive.
// Replaces ad-hoc glass-card classNames across the homepage.

type Variant = "hero" | "metric" | "timeline" | "ai" | "compact";

interface RainzCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  glow?: "blue" | "amber" | "violet" | "none";
  shimmer?: boolean; // animated AI border
}

const variantClasses: Record<Variant, string> = {
  hero: "rounded-[1.75rem] p-6 sm:p-7",
  metric: "rounded-2xl p-4",
  timeline: "rounded-2xl p-4 sm:p-5",
  ai: "rounded-[1.75rem] p-6 sm:p-7",
  compact: "rounded-xl p-3",
};

const glowClasses: Record<string, string> = {
  blue: "before:bg-[radial-gradient(circle_at_30%_0%,hsl(212_90%_55%/0.18),transparent_60%)]",
  amber: "before:bg-[radial-gradient(circle_at_70%_0%,hsl(38_95%_60%/0.18),transparent_60%)]",
  violet: "before:bg-[radial-gradient(circle_at_50%_0%,hsl(258_85%_65%/0.18),transparent_60%)]",
  none: "",
};

export const RainzCard = React.forwardRef<HTMLDivElement, RainzCardProps>(
  ({ className, variant = "metric", glow = "none", shimmer = false, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative isolate overflow-hidden",
          "bg-[hsl(217_45%_8%/0.55)] dark:bg-[hsl(217_45%_8%/0.55)]",
          "border border-white/[0.08]",
          "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          "backdrop-blur-[28px] backdrop-saturate-[170%]",
          // Top glow pseudo
          glow !== "none" &&
            "before:absolute before:inset-0 before:-z-10 before:pointer-events-none before:opacity-90",
          glow !== "none" && glowClasses[glow],
          variantClasses[variant],
          shimmer &&
            "after:absolute after:inset-0 after:rounded-[inherit] after:p-px after:[mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] after:[mask-composite:exclude] after:bg-[conic-gradient(from_var(--rainz-ai-angle,0deg),transparent_0%,hsl(212_95%_65%/0.55)_25%,transparent_50%,hsl(258_85%_70%/0.5)_75%,transparent_100%)] after:animate-[rainz-spin_6s_linear_infinite] after:pointer-events-none",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
RainzCard.displayName = "RainzCard";
