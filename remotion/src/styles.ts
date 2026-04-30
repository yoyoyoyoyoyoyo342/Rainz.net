import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceFontFamily } = loadSpaceGrotesk("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const { fontFamily: interFontFamily } = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const FONTS = {
  display: spaceFontFamily,
  body: interFontFamily,
};

export const COLORS = {
  bg: "#0B1628",
  primary: "#3B82F6",
  accent: "#FF6154",
  white: "#F1F5F9",
  muted: "#94A3B8",
  surface: "#1E293B",
  green: "#22C55E",
  purple: "#A855F7",
  amber: "#F59E0B",
};
