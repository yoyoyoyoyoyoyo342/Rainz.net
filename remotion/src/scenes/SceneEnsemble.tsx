import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { colors } from "../theme";

const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "700"], subsets: ["latin"] });

const MODELS = [
  "ECMWF", "GFS", "ICON", "Met.no", "JMA",
  "Open-Meteo", "Best-Match", "OpenWeather", "GEM",
];

export const SceneEnsemble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleP = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const titleY = interpolate(titleP, [0, 1], [30, 0]);

  // 9 model chips converging into a central card
  const cx = 960, cy = 580;
  const ringR = 280;

  const exit = interpolate(frame, [105, 130], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      {/* Heading */}
      <div
        style={{
          position: "absolute",
          top: 140,
          width: "100%",
          textAlign: "center",
          transform: `translateY(${titleY}px)`,
          opacity: titleP,
        }}
      >
        <div style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 22, letterSpacing: 8, color: colors.gold, textTransform: "uppercase" }}>
          New in 2.0
        </div>
        <div style={{ fontFamily: displayFont, fontWeight: 700, fontSize: 108, color: colors.ink, marginTop: 12, letterSpacing: -2 }}>
          9-Model AI Ensemble
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 28, color: colors.inkMute, marginTop: 8 }}>
          Every major model. One trusted forecast.
        </div>
      </div>

      {/* Model chips */}
      {MODELS.map((name, i) => {
        const angle = (i / MODELS.length) * Math.PI * 2 - Math.PI / 2;
        const startX = cx + Math.cos(angle) * ringR * 2.2;
        const startY = cy + Math.sin(angle) * ringR * 2.2;
        const endX = cx + Math.cos(angle) * ringR;
        const endY = cy + Math.sin(angle) * ringR;

        const inP = spring({ frame: frame - 20 - i * 2, fps, config: { damping: 18, stiffness: 80 } });
        const x = interpolate(inP, [0, 1], [startX, endX]);
        const y = interpolate(inP, [0, 1], [startY, endY]);

        // Converge to center after 75
        const conv = spring({ frame: frame - 75, fps, config: { damping: 200 } });
        const fx = interpolate(conv, [0, 1], [x, cx]);
        const fy = interpolate(conv, [0, 1], [y, cy]);
        const opacity = interpolate(conv, [0, 1], [1, 0]);

        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: fx,
              top: fy,
              transform: "translate(-50%, -50%)",
              padding: "12px 22px",
              background: "rgba(15,21,48,0.85)",
              border: `1px solid ${colors.blue}55`,
              borderRadius: 999,
              color: colors.ink,
              fontFamily: bodyFont,
              fontWeight: 600,
              fontSize: 22,
              opacity: opacity * inP,
              backdropFilter: "blur(6px)",
              boxShadow: `0 6px 24px rgba(59,125,255,0.25)`,
            }}
          >
            {name}
          </div>
        );
      })}

      {/* Central result card */}
      {(() => {
        const cardP = spring({ frame: frame - 78, fps, config: { damping: 16, stiffness: 100 } });
        const scale = interpolate(cardP, [0, 1], [0.5, 1]);
        const opacity = cardP;
        return (
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              width: 460,
              padding: "30px 40px",
              background: `linear-gradient(135deg, ${colors.panel}, ${colors.bgSoft})`,
              border: `1px solid ${colors.gold}66`,
              borderRadius: 24,
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${colors.gold}33`,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: bodyFont, fontSize: 18, color: colors.gold, letterSpacing: 4, textTransform: "uppercase" }}>
              Consensus
            </div>
            <div style={{ fontFamily: displayFont, fontSize: 96, color: colors.ink, lineHeight: 1, marginTop: 4 }}>
              18°
            </div>
            <div style={{ fontFamily: bodyFont, fontSize: 22, color: colors.inkMute, marginTop: 6 }}>
              Partly cloudy · 92% certainty
            </div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
