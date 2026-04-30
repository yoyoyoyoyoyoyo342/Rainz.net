import { useMemo } from "react";

/**
 * Detects if user is running in PWA (standalone) mode or desktop app.
 * Used to gate features that require the installed app.
 */
export function useAppPlatform() {
  const platform = useMemo(() => {
    if (typeof window === "undefined") return { isPWA: false, isDesktopApp: false, isAppUser: false };

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Electron / Tauri user agent markers
    const ua = navigator.userAgent;
    const isDesktopApp = /Electron|Tauri/i.test(ua);

    return {
      isPWA: isStandalone,
      isDesktopApp,
      isAppUser: isStandalone || isDesktopApp,
    };
  }, []);

  return platform;
}
