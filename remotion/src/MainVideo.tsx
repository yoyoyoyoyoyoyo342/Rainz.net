import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { Feature1Scene } from "./scenes/Feature1Scene";
import { Feature2Scene } from "./scenes/Feature2Scene";
import { Feature3Scene } from "./scenes/Feature3Scene";
import { CTAScene } from "./scenes/CTAScene";

const T = 20; // transition duration

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Persistent animated background
  const gradAngle = interpolate(frame, [0, 1050], [135, 200]);

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradAngle}deg, #0B1628 0%, #111D33 40%, #0F172A 70%, #0B1628 100%)`,
        }}
      />

      {/* Floating accent orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: interpolate(frame, [0, 1050], [-100, 200]),
          left: interpolate(frame, [0, 1050], [-200, 100]),
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,97,84,0.08) 0%, transparent 70%)",
          bottom: interpolate(frame, [0, 1050], [0, -150]),
          right: interpolate(frame, [0, 1050], [-100, 200]),
        }}
      />

      {/* Scene transitions */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <ProblemScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <SolutionScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Feature1Scene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Feature2Scene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Feature3Scene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={210}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
