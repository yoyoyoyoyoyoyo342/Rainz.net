import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PillChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface PillChipsProps<T extends string = string> {
  options: PillChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function PillChips<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: PillChipsProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1",
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all",
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                : "bg-background/60 text-foreground border-border/50 hover:border-primary/40 hover:bg-background/80"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
