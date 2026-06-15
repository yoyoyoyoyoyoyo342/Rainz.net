import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { colors } from "../theme";
import { GoldenLogo } from "../components/GoldenLogo";

const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["400", "600"], subsets: ["latin"] });

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  const titleProgress = spring({ frame: frame - 36, fps, config: { damping: 200 } });
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const subDelay = spring({ frame: frame - 60, fps, config: { damping: 200 } });
  const subY = interpolate(subDelay, [0, 1], [20, 0]);

  // Title kinetic per-char shimmer
  const chars = "Rejn 2.0".split("");

  // Exit
  const exit = interpolate(frame, [110, 140], [1, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blurOut = interpolate(frame, [115, 140], [0, 8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", filter: `blur(${blurOut}px)`, opacity: exit }}>
      <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, marginBottom: 36 }}>
        <GoldenLogo size={260} />
      </div>

      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 168,
          color: colors.ink,
          letterSpacing: -4,
          transform: `translateY(${titleY}px)`,
          opacity: titleProgress,
          display: "flex",
          gap: 2,
        }}
      >
        {chars.map((c, i) => {
          const shimmer = Math.sin((frame - i * 4) / 8) * 0.5 + 0.5;
          const isAccent = c === "2" || c === "." || c === "0";
          const color = isAccent
            ? `rgb(${interpolate(shimmer, [0, 1], [201, 246])}, ${interpolate(shimmer, [0, 1], [150, 215])}, ${interpolate(shimmer, [0, 1], [59, 122])})`
            : colors.ink;
          return (
            <span key={i} style={{ color, textShadow: isAccent ? `0 0 30px ${colors.gold}80` : undefined }}>
              {c}
            </span>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: bodyFont,
          fontWeight: 400,
          fontSize: 34,
          color: colors.inkMute,
          marginTop: 24,
          letterSpacing: 6,
          textTransform: "uppercase",
          transform: `translateY(${subY}px)`,
          opacity: subDelay,
        }}
      >
        Weather, perfected.
      </div>
    </AbsoluteFill>
  );
};
