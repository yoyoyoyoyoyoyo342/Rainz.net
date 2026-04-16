import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { FONTS, COLORS } from "../styles";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame: frame - 5, fps, config: { damping: 12 } });
  const textS = spring({ frame: frame - 25, fps, config: { damping: 18 } });
  const badgeS = spring({ frame: frame - 50, fps, config: { damping: 10, stiffness: 150 } });
  const urlS = spring({ frame: frame - 70, fps, config: { damping: 20 } });

  // Pulsing glow
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* PH-themed glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 60%)`,
          opacity: pulse,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, zIndex: 1 }}>
        {/* Logo */}
        <Img
          src={staticFile("images/logo.png")}
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            transform: `scale(${interpolate(logoS, [0, 1], [0.5, 1])})`,
            opacity: interpolate(logoS, [0, 1], [0, 1]),
          }}
        />

        {/* Main CTA */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.03em",
            textAlign: "center" as const,
            transform: `translateY(${interpolate(textS, [0, 1], [40, 0])}px)`,
            opacity: interpolate(textS, [0, 1], [0, 1]),
          }}
        >
          We're live on{" "}
          <span style={{ color: COLORS.accent }}>Product Hunt</span>
        </div>

        {/* PH badge-style button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 48px",
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.accent}, #FF8A65)`,
            transform: `scale(${interpolate(badgeS, [0, 1], [0.7, 1])})`,
            opacity: interpolate(badgeS, [0, 1], [0, 1]),
            boxShadow: `0 8px 32px ${COLORS.accent}40`,
          }}
        >
          <span style={{ fontSize: 32 }}>🚀</span>
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 32,
              fontWeight: 700,
              color: "white",
            }}
          >
            Upvote Rainz
          </span>
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(urlS, [0, 1], [0, 0.8]),
            fontWeight: 500,
          }}
        >
          rainz.net · 100% free
        </div>
      </div>
    </AbsoluteFill>
  );
};
