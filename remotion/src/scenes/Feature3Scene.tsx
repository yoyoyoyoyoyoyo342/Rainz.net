import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FONTS, COLORS } from "../styles";

const leaderboard = [
  { rank: 1, name: "WeatherWiz", pts: 12450, emoji: "🏆" },
  { rank: 2, name: "StormChaser", pts: 11200, emoji: "🥈" },
  { rank: 3, name: "CloudKing", pts: 10890, emoji: "🥉" },
  { rank: 4, name: "RainMaster", pts: 9340, emoji: "4" },
  { rank: 5, name: "You →", pts: 8720, emoji: "⬆️", highlight: true },
];

export const Feature3Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 18,
            color: COLORS.amber,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
          }}
        >
          Feature 03
        </div>

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.02em",
            opacity: interpolate(titleS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Leaderboards & Streaks
        </div>

        {/* Leaderboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 600 }}>
          {leaderboard.map((entry, i) => {
            const delay = 20 + i * 12;
            const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
            const x = interpolate(s, [0, 1], [200, 0]);
            const opacity = interpolate(s, [0, 1], [0, 1]);
            const isHighlight = (entry as any).highlight;

            return (
              <div
                key={entry.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 24px",
                  borderRadius: 16,
                  background: isHighlight ? `${COLORS.primary}20` : `${COLORS.surface}80`,
                  border: isHighlight ? `2px solid ${COLORS.primary}60` : `1px solid ${COLORS.surface}`,
                  transform: `translateX(${x}px)`,
                  opacity,
                }}
              >
                <span style={{ fontSize: 28, width: 40, textAlign: "center" as const }}>
                  {entry.emoji}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 24,
                    fontWeight: 600,
                    color: isHighlight ? COLORS.primary : COLORS.white,
                    flex: 1,
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {entry.pts.toLocaleString()} pts
                </span>
              </div>
            );
          })}
        </div>

        {/* Streak counter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(
              spring({ frame: frame - 100, fps, config: { damping: 15 } }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          <span style={{ fontSize: 40 }}>🔥</span>
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 36,
              color: COLORS.amber,
              fontWeight: 700,
            }}
          >
            14-day streak!
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
