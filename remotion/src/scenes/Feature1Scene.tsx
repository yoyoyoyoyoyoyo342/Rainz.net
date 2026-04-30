import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FONTS, COLORS } from "../styles";

const sources = [
  { name: "ECMWF", color: "#3B82F6" },
  { name: "GFS", color: "#22C55E" },
  { name: "DWD ICON", color: "#F59E0B" },
  { name: "UKMO", color: "#A855F7" },
  { name: "JMA", color: "#EF4444" },
  { name: "MET Norway", color: "#06B6D4" },
];

export const Feature1Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        {/* Badge */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 18,
            color: COLORS.primary,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
          }}
        >
          Feature 01
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.02em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
            textAlign: "center",
          }}
        >
          6+ Weather Sources
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(titleS, [0, 1], [0, 0.9]),
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Aggregated for the most accurate prediction possible
        </div>

        {/* Source pills */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
          {sources.map((src, i) => {
            const delay = 30 + i * 10;
            const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 200 } });
            const scale = interpolate(s, [0, 1], [0.6, 1]);
            const opacity = interpolate(s, [0, 1], [0, 1]);

            return (
              <div
                key={src.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 28px",
                  borderRadius: 16,
                  background: `${src.color}15`,
                  border: `2px solid ${src.color}40`,
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: src.color,
                    boxShadow: `0 0 12px ${src.color}80`,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.white,
                  }}
                >
                  {src.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Converging lines animation */}
        <div style={{ position: "relative", width: 200, height: 60 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: 4,
              height: interpolate(frame, [80, 120], [0, 60], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              background: `linear-gradient(to top, ${COLORS.primary}, transparent)`,
              transform: "translateX(-50%)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              fontFamily: FONTS.body,
              fontSize: 16,
              color: COLORS.primary,
              fontWeight: 600,
              opacity: interpolate(frame, [110, 130], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            → Best Forecast
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
