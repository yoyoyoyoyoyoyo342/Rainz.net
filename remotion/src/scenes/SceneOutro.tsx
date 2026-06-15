import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { colors } from "../theme";
import { GoldenLogo } from "../components/GoldenLogo";

const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoP = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(logoP, [0, 1], [0.6, 1]);

  const titleP = spring({ frame: frame - 24, fps, config: { damping: 200 } });
  const subP = spring({ frame: frame - 44, fps, config: { damping: 200 } });
  const urlP = spring({ frame: frame - 64, fps, config: { damping: 16, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${logoScale})`, opacity: logoP, marginBottom: 30 }}>
        <GoldenLogo size={200} />
      </div>

      <div
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: 138,
          color: colors.ink,
          letterSpacing: -3,
          opacity: titleP,
          transform: `translateY(${interpolate(titleP, [0, 1], [30, 0])}px)`,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        Rejn 2.0
      </div>

      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 30,
          color: colors.inkMute,
          marginTop: 20,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: subP,
        }}
      >
        Free · Forever · Built in Scandinavia
      </div>

      <div
        style={{
          marginTop: 44,
          padding: "20px 44px",
          background: `linear-gradient(90deg, ${colors.goldDeep}, ${colors.gold}, ${colors.goldBright})`,
          borderRadius: 999,
          fontFamily: bodyFont,
          fontWeight: 700,
          fontSize: 38,
          color: "#1a1300",
          letterSpacing: 1,
          opacity: urlP,
          transform: `scale(${interpolate(urlP, [0, 1], [0.85, 1])})`,
          boxShadow: `0 20px 60px ${colors.gold}55, 0 0 80px ${colors.gold}33`,
        }}
      >
        rainz.net
      </div>
    </AbsoluteFill>
  );
};
