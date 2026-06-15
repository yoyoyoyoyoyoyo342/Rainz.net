import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  // Slow drifting radial gradients
  const drift = Math.sin(frame / 80) * 60;
  const drift2 = Math.cos(frame / 100) * 80;
  return (
    <AbsoluteFill style={{ background: colors.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(900px 700px at ${50 + drift}% ${30 + drift2 * 0.2}%, rgba(59,125,255,0.22), transparent 60%),
            radial-gradient(700px 600px at ${80 - drift}% ${75 + drift}%, rgba(233,196,106,0.10), transparent 65%),
            radial-gradient(1100px 800px at 10% 90%, rgba(30,63,168,0.18), transparent 60%)`,
        }}
      />
      {/* Fine grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
