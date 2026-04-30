import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { FONTS, COLORS } from "../styles";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = [
    "Weather apps are boring.",
    "Same data. Same design.",
    "No reason to come back.",
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
        {lines.map((line, i) => {
          const delay = i * 25;
          const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
          const y = interpolate(s, [0, 1], [60, 0]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          // Strike-through on first two lines after they appear
          const strikeDelay = 90 + i * 15;
          const strikeProgress = interpolate(frame, [strikeDelay, strikeDelay + 20], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                transform: `translateY(${y}px)`,
                opacity,
                position: "relative",
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.display,
                  fontSize: i === 0 ? 72 : 56,
                  fontWeight: 700,
                  color: i === 0 ? COLORS.white : COLORS.muted,
                  letterSpacing: "-0.02em",
                }}
              >
                {line}
              </span>
              {i < 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: "55%",
                    left: 0,
                    height: 4,
                    width: `${strikeProgress}%`,
                    background: COLORS.accent,
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Emoji accents */}
      <Sequence from={10}>
        <div
          style={{
            position: "absolute",
            top: 160,
            right: 280,
            fontSize: 80,
            opacity: interpolate(
              spring({ frame: frame - 10, fps, config: { damping: 12 } }),
              [0, 1],
              [0, 0.3]
            ),
            transform: `rotate(${interpolate(frame, [10, 180], [0, 15])}deg)`,
          }}
        >
          😴
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
