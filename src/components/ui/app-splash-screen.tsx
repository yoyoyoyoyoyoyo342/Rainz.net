import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPWAInstalled } from "@/lib/pwa-utils";
import { getRandomWeatherFact } from "@/lib/weather-facts";

const SESSION_KEY = "rainz-splash-shown";
const SPLASH_DURATION_MS = 3000;

/**
 * Splash screen shown when the app boots.
 * - Always shown for PWA / native (Capacitor) launches.
 * - On the website, shown once per browser session.
 * - Renders as an overlay so the app loads behind it during the 3s display.
 */
export function AppSplashScreen() {
  const [visible, setVisible] = useState(false);
  const fact = useMemo(() => getRandomWeatherFact(), []);

  useEffect(() => {
    // Skip on embed routes / iframes
    if (window.self !== window.top) return;
    if (window.location.pathname === "/embed") return;

    const isNative =
      typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform?.();
    const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";

    // Show on native or PWA every launch; on web only once per session
    if (alreadyShown && !isNative) return;

    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, "1");

    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-6"
          aria-hidden="true"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <img
                src="/logo.png"
                alt="Rainz"
                className="relative w-28 h-28 object-contain drop-shadow-lg"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Rainz
              </h1>
              <p className="text-sm text-muted-foreground">Weather, reimagined</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-2 max-w-xs text-center"
            >
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                Did you know?
              </p>
              <p className="text-sm text-foreground/90 leading-snug">
                {fact}
              </p>
            </motion.div>

            <motion.div
              className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="h-full bg-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
