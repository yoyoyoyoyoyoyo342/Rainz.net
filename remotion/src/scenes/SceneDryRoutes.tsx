import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { colors } from "../theme";

const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const SceneDryRoutes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleP = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [105, 130], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // SVG route path animation
  const pathLen = 1400;
  const drawP = interpolate(frame, [20, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotProgress = drawP;

  // Sample dot position along curve
  const startX = 180, startY = 760;
  const endX = 1200, endY = 220;
  const c1x = 500, c1y = 200;
  const c2x = 800, c2y = 900;
  const bz = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * startX + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * endX,
      y: mt * mt * mt * startY + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * endY,
    };
  };
  const dot = bz(dotProgress);

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 140,
          opacity: titleP,
          transform: `translateY(${interpolate(titleP, [0, 1], [30, 0])}px)`,
        }}
      >
        <div style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 22, letterSpacing: 8, color: colors.gold, textTransform: "uppercase" }}>
          DryRoutes + AR
        </div>
        <div style={{ fontFamily: displayFont, fontWeight: 700, fontSize: 96, color: colors.ink, marginTop: 12, letterSpacing: -2 }}>
          Walk between the raindrops.
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 28, color: colors.inkMute, marginTop: 8, maxWidth: 900 }}>
          Live navigation that routes around rain — overlaid on your camera.
        </div>
      </div>

      {/* Map panel */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="route" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={colors.blue} />
            <stop offset="100%" stopColor={colors.gold} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Rain blobs */}
        {[
          { x: 700, y: 540, r: 140 },
          { x: 1000, y: 760, r: 180 },
          { x: 400, y: 420, r: 120 },
        ].map((b, i) => {
          const p = spring({ frame: frame - 14 - i * 4, fps, config: { damping: 200 } });
          return (
            <circle
              key={i}
              cx={b.x}
              cy={b.y}
              r={b.r}
              fill={colors.blue}
              opacity={p * 0.18}
              filter="url(#glow)"
            />
          );
        })}

        {/* Route ghost */}
        <path
          d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
          stroke="rgba(246,247,251,0.15)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
        {/* Drawn route */}
        <path
          d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
          stroke="url(#route)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - drawP)}
          filter="drop-shadow(0 0 12px rgba(233,196,106,0.6))"
        />

        {/* Endpoints */}
        <circle cx={startX} cy={startY} r={14} fill={colors.blue} />
        <circle cx={endX} cy={endY} r={18} fill={colors.gold} />

        {/* Moving dot */}
        {drawP > 0.02 && (
          <g>
            <circle cx={dot.x} cy={dot.y} r={28} fill={colors.gold} opacity={0.25} />
            <circle cx={dot.x} cy={dot.y} r={14} fill={colors.goldBright} />
          </g>
        )}
      </svg>

      {/* AR HUD chip */}
      {(() => {
        const p = spring({ frame: frame - 70, fps, config: { damping: 16, stiffness: 100 } });
        return (
          <div
            style={{
              position: "absolute",
              right: 120,
              bottom: 140,
              padding: "20px 28px",
              background: "rgba(11,16,32,0.85)",
              border: `1px solid ${colors.gold}55`,
              borderRadius: 18,
              backdropFilter: "blur(8px)",
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [20, 0])}px)`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
            }}
          >
            <div style={{ fontFamily: bodyFont, fontSize: 18, color: colors.gold, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>
              AR Overlay · Live
            </div>
            <div style={{ fontFamily: displayFont, fontSize: 40, color: colors.ink, marginTop: 4 }}>
              Stay dry in 4 min
            </div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
