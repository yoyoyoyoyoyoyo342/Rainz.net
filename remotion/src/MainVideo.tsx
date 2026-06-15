import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Background } from "./components/Background";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneEnsemble } from "./scenes/SceneEnsemble";
import { ScenePredict } from "./scenes/ScenePredict";
import { SceneDryRoutes } from "./scenes/SceneDryRoutes";
import { SceneOutro } from "./scenes/SceneOutro";

// Total: 5 scenes × 140 = 700, minus 4 transitions × 25 = 100 → 600 frames (20s @ 30fps)
const SCENE = 140;
const TRANS = 25;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneEnsemble />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <ScenePredict />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneDryRoutes />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
