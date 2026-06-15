import { Img, staticFile } from "remotion";
import { colors } from "../theme";

export const GoldenLogo: React.FC<{ size?: number; glow?: number }> = ({
  size = 220,
  glow = 1,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -size * 0.4,
          background: `radial-gradient(circle, ${colors.gold}55, transparent 60%)`,
          filter: `blur(${24 * glow}px)`,
          opacity: 0.85 * glow,
        }}
      />
      <Img
        src={staticFile("images/golden-logo.png")}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          filter: `drop-shadow(0 8px 28px ${colors.gold}55)`,
        }}
      />
    </div>
  );
};
