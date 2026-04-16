import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Rocket } from "lucide-react";

export function ProductHuntLaunchBanner() {
  const now = new Date();
  const start = new Date("2026-04-16T00:00:00");
  const end = new Date("2026-04-19T00:00:00");
  const isInWindow = now >= start && now <= end;

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("ph-launch-dismissed") === "true"
  );

  if (!isInWindow || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("ph-launch-dismissed", "true");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className="mb-4 rounded-2xl p-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #FF6154 0%, #FF8A65 100%)" }}
      >
        <Rocket className="h-5 w-5 text-white shrink-0" />
        <p className="flex-1 text-sm font-semibold text-white min-w-0">
          We're live on Product Hunt! Support us 🎉
        </p>
        <a
          href="https://www.producthunt.com/posts/rainz-weather"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-bold text-white hover:bg-white/30 transition-colors"
        >
          Upvote →
        </a>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
