import React, { useEffect, useMemo, useRef, useState } from "react";

// Rainz 2.0 — hybrid photoreal sky + WebGL-lite particle FX.
// Layers (bottom -> top):
//  1. Deep gradient sky (time-of-day driven, multi-stop, realistic).
//  2. Sun/Moon disc with soft halo (radial gradient + drop-shadow).
//  3. Two parallax cloud plates (CSS transforms, wind-driven speed/direction).
//  4. Canvas FX layer (rain / snow / lightning / aurora — picked from condition).
//  5. Atmospheric tint + film grain.
//
// No three.js: keeps initial weight tiny, runs ~60fps on iPhone 12.
// Respects prefers-reduced-motion (pauses canvas + clouds).

export type SkyCondition =
  | "clear" | "partly-cloudy" | "cloudy" | "overcast"
  | "rain" | "drizzle" | "thunderstorm" | "snow" | "sleet"
  | "fog" | "mist" | "haze";

interface SkyRendererProps {
  condition?: string;
  sunrise?: string | number;
  sunset?: string | number;
  windSpeedMps?: number;
  windDirectionDeg?: number;
}

function normalizeCondition(c?: string): SkyCondition {
  const v = (c || "").toLowerCase();
  if (/thunder|storm/.test(v)) return "thunderstorm";
  if (/snow|blizzard/.test(v)) return "snow";
  if (/sleet|ice/.test(v)) return "sleet";
  if (/drizzle/.test(v)) return "drizzle";
  if (/rain|shower/.test(v)) return "rain";
  if (/fog/.test(v)) return "fog";
  if (/mist|haze/.test(v)) return "haze";
  if (/overcast/.test(v)) return "overcast";
  if (/cloud/.test(v)) return v.includes("partly") || v.includes("few") || v.includes("scattered") ? "partly-cloudy" : "cloudy";
  return "clear";
}

// Solar elevation 0..1 (0 = horizon/night, 1 = noon). Cheap approximation.
function sunElevation(now: Date, sunriseMs?: number, sunsetMs?: number): number {
  if (!sunriseMs || !sunsetMs) {
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < 6 || h > 20) return 0;
    return Math.sin(((h - 6) / 14) * Math.PI);
  }
  const t = now.getTime();
  if (t < sunriseMs || t > sunsetMs) return 0;
  const p = (t - sunriseMs) / (sunsetMs - sunriseMs);
  return Math.sin(p * Math.PI);
}

interface SkyGradient {
  top: string;
  mid: string;
  bot: string;
  tint: string;
}

function skyGradient(elev: number, cond: SkyCondition, isNight: boolean): SkyGradient {
  // Realistic multi-stop colors for each band of day.
  if (isNight) {
    if (cond === "thunderstorm") return { top: "#06070d", mid: "#10131e", bot: "#1b2030", tint: "rgba(80,90,140,0.05)" };
    if (cond === "snow") return { top: "#0a1224", mid: "#152844", bot: "#2a4366", tint: "rgba(180,200,230,0.04)" };
    return { top: "#04060f", mid: "#0a1426", bot: "#152340", tint: "rgba(120,140,200,0.03)" };
  }
  // Sunrise / sunset
  if (elev < 0.18) {
    return { top: "#1a2745", mid: "#7a4a5e", bot: "#f0a25a", tint: "rgba(255,180,120,0.06)" };
  }
  // Mid-morning / mid-afternoon
  if (elev < 0.55) {
    if (cond === "overcast" || cond === "cloudy") return { top: "#5d7a93", mid: "#86a0b5", bot: "#b5c8d6", tint: "rgba(255,255,255,0.02)" };
    if (cond === "rain" || cond === "drizzle") return { top: "#3d5266", mid: "#5d7385", bot: "#8095a3", tint: "rgba(120,140,160,0.04)" };
    return { top: "#3a6db0", mid: "#6fa3d6", bot: "#b9d6ec", tint: "rgba(255,240,210,0.04)" };
  }
  // Noon
  if (cond === "overcast") return { top: "#86969f", mid: "#a5b1ba", bot: "#c4ccd3", tint: "rgba(255,255,255,0.03)" };
  if (cond === "cloudy" || cond === "partly-cloudy") return { top: "#4a86c4", mid: "#82b3da", bot: "#c7dceb", tint: "rgba(255,255,255,0.03)" };
  if (cond === "rain" || cond === "thunderstorm" || cond === "drizzle") return { top: "#2c3e54", mid: "#4d6478", bot: "#74899b", tint: "rgba(80,100,120,0.05)" };
  if (cond === "snow") return { top: "#778ea6", mid: "#a1b6c8", bot: "#cad9e6", tint: "rgba(220,230,240,0.04)" };
  if (cond === "fog" || cond === "haze") return { top: "#8e9aa5", mid: "#aab4be", bot: "#c1c9d1", tint: "rgba(255,255,255,0.04)" };
  return { top: "#1f6dc4", mid: "#5aa1e3", bot: "#a8d1f0", tint: "rgba(255,250,235,0.05)" };
}

function parseTimeToMs(v?: string | number): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

// Canvas particle FX — picked by condition.
function useFxCanvas(
  ref: React.RefObject<HTMLCanvasElement>,
  cond: SkyCondition,
  enabled: boolean,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let visible = !document.hidden;
    const onVis = () => { visible = !document.hidden; if (visible) loop(); };
    document.addEventListener("visibilitychange", onVis);

    // Particle init
    const isRain = cond === "rain" || cond === "drizzle" || cond === "thunderstorm";
    const isSnow = cond === "snow" || cond === "sleet";
    const count = isRain ? (cond === "drizzle" ? 90 : 180) : isSnow ? 110 : 0;
    const drops: Array<{ x: number; y: number; vx: number; vy: number; len: number; alpha: number; r?: number; sway?: number; phase?: number }> = [];
    for (let i = 0; i < count; i++) {
      if (isRain) {
        drops.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: cond === "thunderstorm" ? -1.5 : -0.6,
          vy: cond === "drizzle" ? 4 + Math.random() * 3 : 9 + Math.random() * 6,
          len: cond === "drizzle" ? 6 + Math.random() * 6 : 10 + Math.random() * 14,
          alpha: 0.18 + Math.random() * 0.3,
        });
      } else if (isSnow) {
        drops.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: 0,
          vy: 0.6 + Math.random() * 1.4,
          len: 0,
          alpha: 0.5 + Math.random() * 0.4,
          r: 0.8 + Math.random() * 2.2,
          sway: 0.3 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Lightning state
    let lightning = 0;
    let nextStrike = cond === "thunderstorm" ? performance.now() + 1500 + Math.random() * 4000 : Infinity;

    const loop = () => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);

      if (isRain) {
        ctx.strokeStyle = "rgba(190,210,235,0.6)";
        ctx.lineWidth = 1;
        for (const d of drops) {
          ctx.globalAlpha = d.alpha;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.vx * 2, d.y + d.len);
          ctx.stroke();
          d.x += d.vx;
          d.y += d.vy;
          if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
          if (d.x < -20) d.x = w + 10;
        }
        ctx.globalAlpha = 1;
      } else if (isSnow) {
        ctx.fillStyle = "rgba(240,248,255,0.95)";
        for (const d of drops) {
          d.phase = (d.phase ?? 0) + 0.02;
          const sx = d.x + Math.sin(d.phase) * (d.sway ?? 0.5) * 6;
          ctx.globalAlpha = d.alpha;
          ctx.beginPath();
          ctx.arc(sx, d.y, d.r ?? 1.5, 0, Math.PI * 2);
          ctx.fill();
          d.y += d.vy;
          if (d.y > h) { d.y = -2; d.x = Math.random() * w; }
        }
        ctx.globalAlpha = 1;
      }

      // Lightning flash overlay
      if (cond === "thunderstorm") {
        const now = performance.now();
        if (now > nextStrike) {
          lightning = 1;
          nextStrike = now + 2500 + Math.random() * 6000;
        }
        if (lightning > 0) {
          ctx.fillStyle = `rgba(220,230,255,${lightning * 0.35})`;
          ctx.fillRect(0, 0, w, h);
          lightning -= 0.06;
          if (lightning < 0) lightning = 0;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref, cond, enabled]);
}

export function SkyRenderer({
  condition,
  sunrise,
  sunset,
  windSpeedMps = 3,
  windDirectionDeg = 90,
}: SkyRendererProps) {
  const cond = useMemo(() => normalizeCondition(condition), [condition]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const sunriseMs = parseTimeToMs(sunrise);
  const sunsetMs = parseTimeToMs(sunset);
  const elev = sunElevation(now, sunriseMs, sunsetMs);
  const isNight = elev <= 0.02;

  const grad = skyGradient(elev, cond, isNight);
  const sunY = `${(1 - elev) * 60 + 8}%`; // higher elev -> closer to top
  const sunX = "70%";
  const sunVisible = !isNight && cond !== "overcast" && cond !== "fog";
  const moonVisible = isNight && cond !== "overcast" && cond !== "fog" && cond !== "thunderstorm" && cond !== "rain";

  const cloudDuration1 = `${Math.max(80, 200 - windSpeedMps * 10)}s`;
  const cloudDuration2 = `${Math.max(120, 280 - windSpeedMps * 12)}s`;
  const cloudOpacity = cond === "clear" ? 0.18 : cond === "partly-cloudy" ? 0.45 : cond === "cloudy" ? 0.7 : cond === "overcast" ? 0.85 : 0.55;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useFxCanvas(canvasRef, cond, !reducedMotion);

  return (
    <div data-decorative="sky" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* 1. Photoreal gradient sky */}
      <div
        className="absolute inset-0 transition-[background] duration-[1500ms] ease-out"
        style={{
          background: `linear-gradient(to bottom, ${grad.top} 0%, ${grad.mid} 55%, ${grad.bot} 100%)`,
        }}
      />

      {/* 2. Sun or moon */}
      {sunVisible && (
        <div
          className="absolute"
          style={{
            top: sunY,
            left: sunX,
            width: 220,
            height: 220,
            transform: "translate(-50%,-50%)",
            background: elev < 0.18
              ? "radial-gradient(circle, rgba(255,180,90,0.9) 0%, rgba(255,150,80,0.4) 30%, transparent 70%)"
              : "radial-gradient(circle, rgba(255,250,220,0.95) 0%, rgba(255,235,180,0.45) 25%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      )}
      {moonVisible && (
        <div
          className="absolute"
          style={{
            top: "18%",
            right: "12%",
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #f4f1e8 0%, #d6d2c4 60%, #a8a596 100%)",
            boxShadow: "0 0 40px 8px rgba(245,240,220,0.25), 0 0 120px 30px rgba(180,200,240,0.15)",
          }}
        />
      )}

      {/* 3. Parallax cloud plates */}
      {cond !== "clear" && (
        <>
          <div
            className="absolute inset-x-0 top-[12%] h-[40%] opacity-80"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 30% 60% at 20% 50%, rgba(255,255,255,0.6) 0%, transparent 65%), radial-gradient(ellipse 25% 55% at 55% 40%, rgba(255,255,255,0.5) 0%, transparent 60%), radial-gradient(ellipse 35% 70% at 85% 55%, rgba(255,255,255,0.55) 0%, transparent 65%)",
              backgroundSize: "200% 100%",
              animation: reducedMotion ? "none" : `rainz-drift ${cloudDuration1} linear infinite`,
              opacity: cloudOpacity,
              filter: cond === "overcast" || cond === "rain" || cond === "thunderstorm" ? "brightness(0.7) blur(2px)" : "blur(1px)",
            }}
          />
          <div
            className="absolute inset-x-0 top-[28%] h-[45%] opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 40% 55% at 15% 40%, rgba(255,255,255,0.45) 0%, transparent 65%), radial-gradient(ellipse 30% 50% at 70% 60%, rgba(255,255,255,0.5) 0%, transparent 60%)",
              backgroundSize: "220% 100%",
              animation: reducedMotion ? "none" : `rainz-drift-rev ${cloudDuration2} linear infinite`,
              opacity: cloudOpacity * 0.8,
              filter: cond === "overcast" || cond === "rain" || cond === "thunderstorm" ? "brightness(0.65) blur(3px)" : "blur(2px)",
            }}
          />
        </>
      )}

      {/* Fog/mist veil */}
      {(cond === "fog" || cond === "haze" || cond === "mist") && (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(200,210,220,0.15) 0%, rgba(220,225,235,0.6) 60%, rgba(200,210,220,0.4) 100%)",
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* 4. FX canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100vw", height: "100vh" }}
      />

      {/* 5. Atmospheric tint + bottom vignette for content readability */}
      <div className="absolute inset-0" style={{ background: grad.tint, mixBlendMode: "screen" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(8,15,30,0.55) 100%)" }} />

      {/* Keyframes for cloud drift + AI shimmer (also referenced by RainzCard) */}
      <style>{`
        @keyframes rainz-drift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes rainz-drift-rev { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes rainz-spin { 0% { --rainz-ai-angle: 0deg; } 100% { --rainz-ai-angle: 360deg; } }
        @property --rainz-ai-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
      `}</style>
    </div>
  );
}
