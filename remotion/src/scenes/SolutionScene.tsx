import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { FONTS, COLORS } from "../styles";

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 150 } });
  const logoOpacity = interpolate(logoScale, [0, 1], [0, 1]);

  const taglineS = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const taglineY = interpolate(taglineS, [0, 1], [40, 0]);

  const subtitleS = spring({ frame: frame - 50, fps, config: { damping: 20 } });

  // Glowing ring behind logo
  const ringScale = interpolate(frame, [5, 60], [0.5, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(frame, [5, 40, 60], [0, 0.4, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Glow ring */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `3px solid ${COLORS.primary}`,
          opacity: ringOpacity,
          transform: `scale(${ringScale})`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        {/* Logo */}
        <Img
          src={staticFile("images/logo.png")}
          style={{
            width: 180,
            height: 180,
            borderRadius: 40,
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.03em",
            transform: `translateY(${taglineY}px)`,
            opacity: interpolate(taglineS, [0, 1], [0, 1]),
            textAlign: "center",
          }}
        >
          Weather, but make it{" "}
          <span style={{ color: COLORS.primary }}>competitive</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(subtitleS, [0, 1], [0, 1]),
            fontWeight: 500,
          }}
        >
          Free · Open · Gamified
        </div>
      </div>
    </AbsoluteFill>
  );
};
