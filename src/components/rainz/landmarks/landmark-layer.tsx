import React, { useMemo } from "react";
import { findLandmark } from "./registry";
import { LANDMARK_COMPONENTS } from "./svgs";

export type LandmarkTimeOfDay = "day" | "golden" | "night";

interface Props {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  sunrise?: string;
  sunset?: string;
  // Optional forced value (e.g. testing)
  forceTime?: LandmarkTimeOfDay;
}

// Palettes tuned to sit *inside* the sky-renderer gradient without competing.
// Uses semantic-ish inline colors since the whole thing is a decorative silhouette
// (not a themable UI surface).
const PALETTES: Record<LandmarkTimeOfDay, Record<string, string>> = {
  day: {
    "--lm-main": "rgba(20, 40, 80, 0.85)",
    "--lm-accent": "rgba(255, 255, 255, 0.55)",
    "--lm-glow": "transparent",
    "--lm-water": "rgba(30, 80, 160, 0.28)",
    "--lm-shimmer": "rgba(255, 255, 255, 0.4)",
    "--lm-face": "#f4ecd8",
    "--lm-flame": "#ffb84a",
    "--lm-tower": "#d94a2a",
    "--lm-tower-opacity": "0.95",
    "--lm-letters": "#f5f2ec",
  },
  golden: {
    "--lm-main": "rgba(80, 30, 45, 0.9)",
    "--lm-accent": "rgba(255, 190, 120, 0.7)",
    "--lm-glow": "rgba(255, 200, 130, 0.9)",
    "--lm-water": "rgba(180, 90, 60, 0.35)",
    "--lm-shimmer": "rgba(255, 220, 170, 0.6)",
    "--lm-face": "#ffe4b0",
    "--lm-flame": "#ffd280",
    "--lm-tower": "#c94328",
    "--lm-tower-opacity": "0.95",
    "--lm-letters": "#ffe0a8",
  },
  night: {
    "--lm-main": "rgba(6, 10, 22, 0.95)",
    "--lm-accent": "rgba(120, 150, 200, 0.35)",
    "--lm-glow": "rgba(255, 220, 140, 0.95)",
    "--lm-water": "rgba(8, 14, 28, 0.7)",
    "--lm-shimmer": "rgba(200, 220, 255, 0.35)",
    "--lm-face": "#ffe08a",
    "--lm-flame": "#ffcf60",
    "--lm-tower": "#3a1a10",
    "--lm-tower-opacity": "0.9",
    "--lm-letters": "#f2e6c3",
  },
};

function parseHHMM(t?: string): number | undefined {
  if (!t) return undefined;
  // Accept "HH:MM" or ISO. Returns minutes-of-day.
  if (/^\d{1,2}:\d{2}/.test(t)) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  const d = new Date(t);
  if (isNaN(d.getTime())) return undefined;
  return d.getHours() * 60 + d.getMinutes();
}

function pickTimeOfDay(sunrise?: string, sunset?: string): LandmarkTimeOfDay {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const sr = parseHHMM(sunrise) ?? 6 * 60;
  const ss = parseHHMM(sunset) ?? 20 * 60;
  const GOLDEN = 40; // minutes on each side
  if (mins < sr - GOLDEN || mins > ss + GOLDEN) return "night";
  if (Math.abs(mins - sr) <= GOLDEN || Math.abs(mins - ss) <= GOLDEN) return "golden";
  return "day";
}

export function LandmarkLayer({
  latitude,
  longitude,
  locationName,
  sunrise,
  sunset,
  forceTime,
}: Props) {
  const entry = useMemo(
    () => findLandmark(latitude, longitude, locationName),
    [latitude, longitude, locationName],
  );

  const time = forceTime ?? pickTimeOfDay(sunrise, sunset);

  if (!entry) return null;
  const Cmp = LANDMARK_COMPONENTS[entry.id];
  if (!Cmp) return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const palette = PALETTES[time];
  const styleVars = palette as unknown as React.CSSProperties;
  const isCompact = !!entry.compact;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 -z-[5] pointer-events-none select-none flex items-end justify-end sm:justify-center"
      style={{
        ...styleVars,
        // Lift above the mobile navbar (~72px + safe area) so it isn't clipped.
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        height: "min(72vh, 640px)",
        maskImage:
          "linear-gradient(to top, black 65%, black 85%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to top, black 65%, black 85%, transparent 100%)",
        opacity: time === "night" ? 0.95 : 0.92,
        transition: "opacity 800ms ease, filter 800ms ease",
        filter: time === "golden" ? "saturate(1.1)" : "none",
      }}
    >
      <div
        style={{
          width: isCompact ? "min(70%, 780px)" : "100%",
          height: "100%",
          // Nudge compact landmarks toward the right edge on wider viewports.
          marginRight: isCompact ? "-4%" : 0,
          transform: isCompact ? "scale(1.15)" : "scale(1.05)",
          transformOrigin: "bottom right",
        }}
      >
        <Cmp reducedMotion={!!reducedMotion} />
      </div>
    </div>
  );
}
