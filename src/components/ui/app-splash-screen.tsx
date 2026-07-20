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
          className="fixed inset-0 z-[6000] grid place-items-center bg-background px-6 text-foreground"
          style={{ fontSize: 16 }}
          aria-hidden="true"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full max-w-sm flex-col items-center gap-4 text-center"
          >
            <img
              src="/logo.png"
              alt="Rejn"
              className="h-24 w-24 object-contain sm:h-28 sm:w-28"
            />
            <p className="text-base font-semibold text-muted-foreground">Be prepared</p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-xs text-center"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold">Did you know: </span>
                {fact}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
