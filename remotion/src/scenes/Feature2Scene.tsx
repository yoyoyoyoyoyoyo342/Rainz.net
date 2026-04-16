import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FONTS, COLORS } from "../styles";

export const Feature2Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  // Prediction card animation
  const cardS = spring({ frame: frame - 25, fps, config: { damping: 15 } });
  const cardScale = interpolate(cardS, [0, 1], [0.8, 1]);

  // Points counter
  const pointsVal = Math.round(interpolate(frame, [60, 120], [0, 285], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));

  // VS animation
  const vsS = spring({ frame: frame - 80, fps, config: { damping: 8, stiffness: 200 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 18,
            color: COLORS.accent,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
          }}
        >
          Feature 02
        </div>

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.02em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Predict & Compete
        </div>

        {/* Prediction card + battle visualization */}
        <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
          {/* Prediction card */}
          <div
            style={{
              width: 320,
              padding: "32px 28px",
              borderRadius: 24,
              background: `${COLORS.surface}`,
              border: `1px solid ${COLORS.primary}30`,
              transform: `scale(${cardScale})`,
              opacity: interpolate(cardS, [0, 1], [0, 1]),
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted }}>
              Your prediction
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: 48, color: COLORS.white }}>
              🌤️ 18°C
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 36,
                color: COLORS.green,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              +{pointsVal} pts
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.accent,
              transform: `scale(${interpolate(vsS, [0, 1], [0, 1.2])}) rotate(${interpolate(vsS, [0, 1], [-20, 0])}deg)`,
              opacity: interpolate(vsS, [0, 1], [0, 1]),
              textShadow: `0 0 40px ${COLORS.accent}60`,
            }}
          >
            ⚔️
          </div>

          {/* Opponent card */}
          <div
            style={{
              width: 320,
              padding: "32px 28px",
              borderRadius: 24,
              background: `${COLORS.surface}`,
              border: `1px solid ${COLORS.accent}30`,
              transform: `scale(${interpolate(
                spring({ frame: frame - 35, fps, config: { damping: 15 } }),
                [0, 1],
                [0.8, 1]
              )})`,
              opacity: interpolate(
                spring({ frame: frame - 35, fps, config: { damping: 15 } }),
                [0, 1],
                [0, 1]
              ),
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.muted }}>
              Friend's prediction
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: 48, color: COLORS.white }}>
              🌧️ 15°C
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: 36, color: COLORS.accent }}>
              +142 pts
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
