import { AnimatePresence, motion } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuidedHelpTip } from "@/hooks/use-amplitude-guided-help";

interface GuidedHelpBannerProps {
  tip: GuidedHelpTip | null;
  onDismiss: (tipId: string) => void;
}

export function GuidedHelpBanner({ tip, onDismiss }: GuidedHelpBannerProps) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-4 mb-3 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{tip.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {tip.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(tip.id)}
              className="shrink-0 rounded-full p-1 hover:bg-muted/50 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {tip.actionLabel && (
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onDismiss(tip.id)}
              >
                {tip.actionLabel}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
