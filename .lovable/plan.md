
# Rejn 2.1.1 — The Vision Update

Goal: make Rejn fully usable for people with visual impairments — including **aniridia** (extreme light sensitivity, nystagmus, reduced acuity), low vision, color blindness, and blindness (screen readers). This update ships one cohesive Vision system, not scattered toggles.

---

## 1. New "Vision" settings hub

A single dedicated tab inside the redesigned Settings dialog: **Vision & Accessibility**. Preferences persist via `user_preferences` (Aiven edge fn) + localStorage fallback so they survive across devices and load *before first paint* (inline script in `index.html`) to prevent a bright flash for photophobic users.

Settings included:

- **Vision profile presets** (one-tap): `Standard`, `Low Vision`, `Aniridia / Photophobia`, `Color Blind`, `Screen Reader`. Each preset toggles the right combination of the switches below.
- **Text size**: 100% / 125% / 150% / 200% (scales `html { font-size }`, not zoom).
- **Contrast**: Normal / High / Maximum (extends existing `.high-contrast` class with a new `.max-contrast`).
- **Reduce brightness** (aniridia): 0–70% dark overlay + forces dark theme + caps `--background` luminance.
- **Reduce blue light**: warm filter layer (`sepia`/hue-rotate on `<html>`).
- **Reduce motion**: already exists — surface it here too.
- **Reduce transparency**: kills backdrop-blur/glass, replaces with solid `--card`.
- **Bold text**: adds `font-weight: 600` minimum globally.
- **Underline links**: forces `text-decoration` on all `<a>`.
- **Focus ring**: Thick / Extra thick (4px / 6px, high-contrast yellow).
- **Color blind mode**: Deuteranopia / Protanopia / Tritanopia (SVG filter on root; also swaps chart palettes).
- **Screen reader mode**: enables extra `aria-live` regions, verbose labels, skips decorative landmarks.
- **Cursor size**: Normal / Large / Huge (custom cursor images).

### Aniridia-specific defaults (when preset selected)
- Force dark theme, lock light mode off.
- Brightness dimmer at 40%.
- Warm filter on.
- Reduce transparency on (kills glare from glass cards).
- Max contrast text.
- Text size 150%.
- Large focus ring.
- Auto-hide the animated sky background + landmark layer (bright gradients trigger photophobia).

---

## 2. Fix existing accessibility debt

Sweep the codebase for the known offenders:

- Icon-only buttons missing `aria-label` (bottom nav bar, briefing card, predict bell, skycam controls, settings tabs).
- Contrast failures from `text-muted-foreground/50`, arbitrary gray classes, and the light-mode `--muted-foreground` (currently `0 0% 9%` vs `--muted 0 0% 63%` — actually fine, but verify against `--card`).
- Multiple `<main>` landmarks — audit routes and consolidate into layout.
- `h-screen` → `h-dvh` for mobile full-height views.
- Add `lang="en"` to `<html>` if missing.
- Add skip-to-content link at top of `App.tsx`.
- Landmark SVGs: add `role="img"` + `<title>` describing the city (e.g. "Copenhagen — The Little Mermaid").
- Weather icons: ensure each has an `aria-label` describing the condition, not just an emoji/svg.
- Charts (UV, pollen, temp): add text-based fallback summaries (`aria-label` on chart + hidden `<table>` for screen readers).

---

## 3. Non-color information cues

Aniridia + color blindness both mean color-only signals fail. Add redundant cues:

- **UV index**: add textual severity ("Extreme", "High") next to the color band.
- **Pollen wheel**: add labels inside each segment, not just color.
- **Prediction results**: ✓ / ✗ icons plus color, not just green/red.
- **Notifications**: bell has both red dot *and* a numeric badge count.
- **Battle win/loss**: icons + words, not just red/green pill.
- **Charts**: add patterns/dashes to lines so they're distinguishable in grayscale.

---

## 4. Screen reader pass

- Verify shadcn primitives are used everywhere (they already ship correct ARIA); replace any hand-rolled dropdowns/dialogs found during audit.
- Add `aria-live="polite"` to the weather hero so temp/condition updates announce.
- Add `aria-live="assertive"` to prediction submission feedback and toast region (sonner already handles this — verify).
- Label the mobile bottom tab bar as `<nav aria-label="Primary">`.
- Landmark structure: `<header>`, single `<main>`, `<nav>`, `<footer>` per route.
- All form inputs on `/auth`, `/predict`, `/ask-rejn` composer get real `<label>` associations.

---

## 5. Keyboard navigation

- Every interactive element reachable via Tab in a logical order.
- Escape closes all dialogs/sheets (shadcn does this — verify custom ones).
- Ask Rejn composer: Cmd/Ctrl+Enter submits.
- Predict form: full keyboard flow.
- Bottom tab bar: arrow-key navigation between tabs.
- Visible focus ring everywhere (`:focus-visible` with `--ring`, thicker when Vision preset active).

---

## 6. Onboarding update

Add a **step to `/welcome`** after signup: "Do you have any visual needs?" with the 5 presets as large tap targets. Applied immediately. Also surface a subtle "Vision settings" link on `/auth` so users can dial it in before even signing in (stored in localStorage pre-auth, migrated on signup).

---

## 7. Technical implementation

### CSS layer
- New file `src/styles/vision.css` imported after `index.css`.
- Adds `.reduce-transparency`, `.reduce-brightness-{0..70}`, `.warm-filter`, `.max-contrast`, `.bold-text`, `.underline-links`, `.thick-focus`, `.cb-deuteranopia`, `.cb-protanopia`, `.cb-tritanopia`, `.large-cursor`.
- Text-size scaling via `html.text-scale-125 { font-size: 20px }` etc.

### Hook
- `src/hooks/use-vision-preferences.tsx`: reads/writes preferences, applies classes to `<html>`, syncs to Aiven via `user-preferences` edge function (already exists — extend its columns).

### DB migration
Extend `user_preferences` (Aiven) with:
```
vision_preset TEXT,
text_scale INT,
contrast_mode TEXT,
brightness_reduction INT,
warm_filter BOOL,
reduce_transparency BOOL,
bold_text BOOL,
underline_links BOOL,
thick_focus BOOL,
color_blind_mode TEXT,
screen_reader_mode BOOL,
cursor_size TEXT
```
Update `user-preferences` edge function (`supabase/functions/user-preferences/index.ts`) to accept these columns.

### Pre-paint script
Inline `<script>` in `index.html` reads localStorage vision prefs and applies classes on `<html>` before React mounts — critical so photophobic users never see a flash of bright UI.

### Files to touch (est.)
- `index.html` — pre-paint script, `lang` attr
- `src/App.tsx` — skip link, apply vision hook globally, single `<main>`
- `src/index.css` — extend high-contrast, add max-contrast
- `src/styles/vision.css` — new
- `src/hooks/use-vision-preferences.tsx` — new
- `src/components/weather/settings-dialog.tsx` — new Vision tab
- `src/pages/Welcome.tsx` — vision step
- `src/pages/Auth.tsx` — pre-auth vision link
- `src/components/weather/uv-index-graph.tsx` — text labels + patterns
- `src/components/weather/pollen-wheel.tsx` (or equivalent) — segment labels
- `src/components/weather/bottom-tab-bar.tsx` — nav landmark + arrow keys + badges
- `src/components/rainz/landmarks/svgs.tsx` — `role`/`<title>`
- `src/components/rainz/sky-renderer.tsx` — respect `reduce-brightness` / hide when vision preset active
- `src/components/rainz/ai-briefing-hero.tsx` — aria-live + labels
- Audit sweep across icon-only Buttons (bottom nav, predict bell, skycam, admin)
- `supabase/functions/user-preferences/index.ts` — new columns

---

## 8. Verification

- Manual: enable each preset, walk every route, screen-reader test with VoiceOver on iOS + NVDA on Windows.
- Automated: run axe-core against the built app for critical/serious findings.
- Aniridia test: verify no white/bright surface ever paints when Aniridia preset is on, even during initial load.

---

## 9. Changelog & release

- Write "The Vision Update" blog post (not published — draft only, matching the pattern from Rejn 2.0/2.1).
- Add `app_changelog` entry so the in-app "What did we change?" popup announces it.

---

## Out of scope for 2.1.1 (later versions)
- Hearing accessibility (captions on any future video content)
- Motor accessibility (dwell click, switch control)
- Cognitive accessibility (reading level toggle, simplified mode)

These are acknowledged and will get their own themed updates.
