import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VisionPreset = "standard" | "low-vision" | "aniridia" | "color-blind" | "screen-reader";
export type ContrastMode = "normal" | "high" | "max";
export type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia";
export type CursorSize = "normal" | "large" | "huge";
export type TextScale = 100 | 125 | 150 | 200;

export interface VisionPrefs {
  preset: VisionPreset;
  textScale: TextScale;
  contrast: ContrastMode;
  brightness: 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70;
  warmFilter: boolean;
  reduceTransparency: boolean;
  reduceMotion: boolean;
  boldText: boolean;
  underlineLinks: boolean;
  thickFocus: boolean;
  colorBlind: ColorBlindMode;
  cursorSize: CursorSize;
  screenReaderMode: boolean;
  /** Last-modified ms since epoch. Used for cloud-vs-local reconciliation. */
  updatedAt?: number;
}

export const DEFAULT_VISION: VisionPrefs = {
  preset: "standard",
  textScale: 100,
  contrast: "normal",
  brightness: 0,
  warmFilter: false,
  reduceTransparency: false,
  reduceMotion: false,
  boldText: false,
  underlineLinks: false,
  thickFocus: false,
  colorBlind: "none",
  cursorSize: "normal",
  screenReaderMode: false,
  updatedAt: 0,
};

export const PRESETS: Record<VisionPreset, Partial<VisionPrefs>> = {
  standard: { ...DEFAULT_VISION },
  "low-vision": {
    textScale: 150,
    contrast: "high",
    boldText: true,
    underlineLinks: true,
    thickFocus: true,
    reduceTransparency: true,
    cursorSize: "large",
  },
  aniridia: {
    textScale: 125,
    contrast: "max",
    brightness: 30,
    warmFilter: true,
    reduceTransparency: true,
    boldText: true,
    underlineLinks: true,
    thickFocus: true,
    reduceMotion: true,
    cursorSize: "large",
  },
  "color-blind": {
    colorBlind: "deuteranopia",
    underlineLinks: true,
    boldText: false,
  },
  "screen-reader": {
    screenReaderMode: true,
    thickFocus: true,
    reduceMotion: true,
  },
};

const STORAGE_KEY = "rejn-vision-prefs";

function loadFromStorage(): VisionPrefs {
  if (typeof window === "undefined") return DEFAULT_VISION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISION;
    return { ...DEFAULT_VISION, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VISION;
  }
}

export function applyVisionClasses(p: VisionPrefs) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;

  // Text scale
  ["text-scale-100", "text-scale-125", "text-scale-150", "text-scale-200"].forEach((c) =>
    html.classList.remove(c),
  );
  html.classList.add(`text-scale-${p.textScale}`);

  // Contrast
  html.classList.toggle("high-contrast", p.contrast === "high" || p.contrast === "max");
  html.classList.toggle("max-contrast", p.contrast === "max");

  // Brightness
  if (p.brightness > 0) html.setAttribute("data-brightness", String(p.brightness));
  else html.removeAttribute("data-brightness");

  // Toggles
  html.classList.toggle("warm-filter", p.warmFilter);
  html.classList.toggle("reduce-transparency", p.reduceTransparency);
  html.classList.toggle("reduce-motion", p.reduceMotion);
  html.classList.toggle("bold-text", p.boldText);
  html.classList.toggle("underline-links", p.underlineLinks);
  html.classList.toggle("thick-focus", p.thickFocus);

  // Color blind
  ["cb-deuteranopia", "cb-protanopia", "cb-tritanopia"].forEach((c) => html.classList.remove(c));
  if (p.colorBlind !== "none") html.classList.add(`cb-${p.colorBlind}`);

  // Cursor
  html.classList.toggle("cursor-large", p.cursorSize === "large");
  html.classList.toggle("cursor-huge", p.cursorSize === "huge");

  // Preset flags (drive font + preset-specific rules)
  html.classList.toggle("aniridia", p.preset === "aniridia");
  html.classList.toggle("low-vision", p.preset === "low-vision");
  html.classList.toggle("screen-reader", p.preset === "screen-reader");
}

interface Ctx {
  prefs: VisionPrefs;
  setPrefs: (patch: Partial<VisionPrefs>) => void;
  applyPreset: (preset: VisionPreset) => void;
  reset: () => void;
}

const VisionContext = createContext<Ctx | null>(null);

export function VisionProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<VisionPrefs>(loadFromStorage);
  const cloudLoadedRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);

  // Apply CSS classes + persist locally on every change.
  useEffect(() => {
    applyVisionClasses(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  // Cloud sync: local-first. Fetch once when a session appears; push debounced
  // on every mutation while signed in. Anonymous users stay purely local.
  useEffect(() => {
    let cancelled = false;

    const pullOnce = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cloudLoadedRef.current || cancelled) return;
      cloudLoadedRef.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("user-preferences", { method: "GET" });
        if (error || cancelled) return;
        const remote = (data?.data?.vision_prefs ?? null) as VisionPrefs | null;
        if (remote && typeof remote === "object") {
          const remoteTs = remote.updatedAt ?? 0;
          const localTs = prefs.updatedAt ?? 0;
          if (remoteTs > localTs) {
            setPrefsState({ ...DEFAULT_VISION, ...remote });
          } else if (localTs > remoteTs) {
            void pushToCloud(prefs);
          }
        } else {
          // No remote yet — seed it with whatever we have locally.
          if ((prefs.updatedAt ?? 0) > 0) void pushToCloud(prefs);
        }
      } catch {
        /* ignore, local wins */
      }
    };

    pullOnce();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session && !cloudLoadedRef.current) pullOnce();
      if (!session) cloudLoadedRef.current = false;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushToCloud = useCallback(async (next: VisionPrefs) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.functions.invoke("user-preferences", {
        method: "PUT",
        body: { vision_prefs: next },
      });
    } catch {
      /* offline / not signed in — local remains source of truth */
    }
  }, []);

  const scheduleCloudPush = useCallback((next: VisionPrefs) => {
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => void pushToCloud(next), 500);
  }, [pushToCloud]);

  const setPrefs = useCallback((patch: Partial<VisionPrefs>) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch, preset: patch.preset ?? p.preset, updatedAt: Date.now() };
      scheduleCloudPush(next);
      return next;
    });
  }, [scheduleCloudPush]);

  const applyPreset = useCallback((preset: VisionPreset) => {
    setPrefsState(() => {
      const next: VisionPrefs = { ...DEFAULT_VISION, ...PRESETS[preset], preset, updatedAt: Date.now() };
      scheduleCloudPush(next);
      return next;
    });
  }, [scheduleCloudPush]);

  const reset = useCallback(() => {
    setPrefsState(() => {
      const next: VisionPrefs = { ...DEFAULT_VISION, updatedAt: Date.now() };
      scheduleCloudPush(next);
      return next;
    });
  }, [scheduleCloudPush]);

  const value = useMemo(() => ({ prefs, setPrefs, applyPreset, reset }), [prefs, setPrefs, applyPreset, reset]);

  return (
    <VisionContext.Provider value={value}>
      {children}
      {/* Portal dimmer for photophobia/aniridia brightness reduction.
          A real DOM element (not body::before) so it never becomes a
          stacking-context ancestor of Radix/vaul portals. */}
      <div id="rejn-vision-dimmer" aria-hidden="true" />
      {/* SVG filter defs for color-blind modes. Rendered once, referenced by CSS. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="rejn-cb-deut">
            <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
          </filter>
          <filter id="rejn-cb-prot">
            <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
          </filter>
          <filter id="rejn-cb-trit">
            <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
    </VisionContext.Provider>
  );
}

export function useVisionPreferences() {
  const ctx = useContext(VisionContext);
  if (!ctx) throw new Error("useVisionPreferences must be used within VisionProvider");
  return ctx;
}
