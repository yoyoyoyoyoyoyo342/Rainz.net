import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { RejnMascot } from "@/components/rejn/rejn-mascot";
import { useAppPlatform } from "@/hooks/use-app-platform";
import { cn } from "@/lib/utils";

interface Props {
  /** Delay (ms) before appearing after mount. Defaults to 30s for ambient dwell. */
  delayMs?: number;
  /** Where the nudge is rendered from — sent to Amplitude for attribution. */
  source: string;
  /** Optional custom copy in the speech bubble. */
  message?: string;
  className?: string;
}

const DISMISS_KEY = "rejn.download_nudge_dismissed_v1";

/**
 * Rejn goat with a speech bubble nudging web users to install the PWA.
 * Never shown when already running as an installed app.
 */
export function DownloadPWANudge({ delayMs = 30_000, source, message, className }: Props) {
  const { isAppUser } = useAppPlatform();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAppUser) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const t = setTimeout(() => {
      setVisible(true);
      import("@amplitude/unified")
        .then((amp) => amp.track("download_nudge_view", { nudge_source: source }))
        .catch(() => {});
    }, delayMs);
    return () => clearTimeout(t);
  }, [delayMs, isAppUser, source]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const click = () => {
    import("@amplitude/unified")
      .then((amp) => amp.track("download_nudge_click", { nudge_source: source }))
      .catch(() => {});
    dismiss();
  };

  if (isAppUser) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed right-4 z-40 flex items-end gap-2 pointer-events-none",
            "bottom-[calc(96px+env(safe-area-inset-bottom))] sm:bottom-6",
            className
          )}
        >
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-background/90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>

            <div className="rounded-2xl bg-background/85 backdrop-blur-xl border border-border/60 shadow-xl px-3 py-2 max-w-[220px] mb-1">
              <p className="text-xs text-foreground leading-snug">
                {message ?? "Psst — Rejn works even better as an app."}
              </p>
              <Link
                to="/download"
                onClick={click}
                className="mt-1.5 inline-flex items-center text-xs font-semibold text-primary hover:underline"
              >
                Install now →
              </Link>
            </div>
          </div>
          <RejnMascot
            pose="wave"
            className="w-20 h-20 shrink-0 drop-shadow-[0_8px_20px_rgba(59,130,246,0.35)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
