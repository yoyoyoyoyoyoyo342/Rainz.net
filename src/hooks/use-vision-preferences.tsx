import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  // Aniridia decorative-hide flag
  html.classList.toggle("aniridia", p.preset === "aniridia");
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

  useEffect(() => {
    applyVisionClasses(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<VisionPrefs>) => {
    setPrefsState((p) => ({ ...p, ...patch, preset: patch.preset ?? p.preset }));
  }, []);

  const applyPreset = useCallback((preset: VisionPreset) => {
    setPrefsState({ ...DEFAULT_VISION, ...PRESETS[preset], preset });
  }, []);

  const reset = useCallback(() => setPrefsState(DEFAULT_VISION), []);

  const value = useMemo(() => ({ prefs, setPrefs, applyPreset, reset }), [prefs, setPrefs, applyPreset, reset]);

  return (
    <VisionContext.Provider value={value}>
      {children}
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
