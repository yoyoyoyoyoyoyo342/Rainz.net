import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { colors } from "../theme";

const { fontFamily: displayFont } = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const ScenePredict: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleP = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [105, 130], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const players = [
    { rank: 1, name: "Sofia", pts: 12480, gold: true },
    { rank: 2, name: "Magnus", pts: 11920, gold: false },
    { rank: 3, name: "Astrid", pts: 10870, gold: false },
    { rank: 4, name: "Eirik", pts: 9610, gold: false },
  ];

  return (
    <AbsoluteFill style={{ opacity: exit, padding: "120px 140px" }}>
      <div style={{ opacity: titleP, transform: `translateY(${interpolate(titleP, [0, 1], [30, 0])}px)` }}>
        <div style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 22, letterSpacing: 8, color: colors.gold, textTransform: "uppercase" }}>
          Predict & Compete
        </div>
        <div style={{ fontFamily: displayFont, fontWeight: 700, fontSize: 96, color: colors.ink, marginTop: 12, letterSpacing: -2, maxWidth: 1100 }}>
          Out-forecast your friends.
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: "flex", gap: 60, marginTop: 60 }}>
        {/* Battle card */}
        {(() => {
          const p = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 90 } });
          const x = interpolate(p, [0, 1], [-120, 0]);
          return (
            <div
              style={{
                flex: 1,
                opacity: p,
                transform: `translateX(${x}px)`,
                padding: 40,
                background: `linear-gradient(160deg, ${colors.panel}, rgba(15,21,48,0.4))`,
                border: `1px solid ${colors.blue}44`,
                borderRadius: 28,
                boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontFamily: bodyFont, fontSize: 20, color: colors.blue, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>
                Battle · Today
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28 }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontFamily: bodyFont, fontSize: 22, color: colors.inkMute }}>You</div>
                  <div style={{ fontFamily: displayFont, fontSize: 86, color: colors.gold, lineHeight: 1, marginTop: 8 }}>
                    17°
                  </div>
                </div>
                <div style={{ fontFamily: displayFont, fontSize: 56, color: colors.inkFaint }}>vs</div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontFamily: bodyFont, fontSize: 22, color: colors.inkMute }}>Magnus</div>
                  <div style={{ fontFamily: displayFont, fontSize: 86, color: colors.ink, lineHeight: 1, marginTop: 8 }}>
                    19°
                  </div>
                </div>
              </div>
              {(() => {
                const winP = spring({ frame: frame - 60, fps, config: { damping: 14, stiffness: 120 } });
                return (
                  <div
                    style={{
                      marginTop: 32,
                      padding: "14px 22px",
                      background: `linear-gradient(90deg, ${colors.goldDeep}, ${colors.gold})`,
                      borderRadius: 14,
                      textAlign: "center",
                      fontFamily: bodyFont,
                      fontWeight: 700,
                      fontSize: 26,
                      color: "#1a1300",
                      opacity: winP,
                      transform: `scale(${interpolate(winP, [0, 1], [0.85, 1])})`,
                      boxShadow: `0 10px 40px ${colors.gold}55`,
                    }}
                  >
                    +100 · You won
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Leaderboard */}
        {(() => {
          const p = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 90 } });
          const x = interpolate(p, [0, 1], [120, 0]);
          return (
            <div
              style={{
                flex: 1,
                opacity: p,
                transform: `translateX(${x}px)`,
                padding: 40,
                background: `linear-gradient(160deg, ${colors.panel}, rgba(15,21,48,0.4))`,
                border: `1px solid ${colors.gold}55`,
                borderRadius: 28,
                boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontFamily: bodyFont, fontSize: 20, color: colors.gold, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>
                Leaderboard
              </div>
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                {players.map((pl, i) => {
                  const rp = spring({ frame: frame - 40 - i * 6, fps, config: { damping: 200 } });
                  return (
                    <div
                      key={pl.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        padding: "16px 20px",
                        borderRadius: 14,
                        background: pl.gold ? `linear-gradient(90deg, ${colors.gold}22, transparent)` : "rgba(255,255,255,0.03)",
                        border: pl.gold ? `1px solid ${colors.gold}66` : "1px solid rgba(255,255,255,0.06)",
                        opacity: rp,
                        transform: `translateX(${interpolate(rp, [0, 1], [40, 0])}px)`,
                      }}
                    >
                      <div style={{ fontFamily: displayFont, fontSize: 32, color: pl.gold ? colors.gold : colors.inkMute, width: 50 }}>
                        {pl.rank}
                      </div>
                      <div style={{ fontFamily: bodyFont, fontSize: 26, color: colors.ink, flex: 1, fontWeight: 600 }}>{pl.name}</div>
                      <div style={{ fontFamily: bodyFont, fontSize: 24, color: pl.gold ? colors.gold : colors.inkMute, fontWeight: 700 }}>
                        {pl.pts.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
};
