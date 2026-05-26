
# Rainz 2.0 — Full Overhaul Plan

A single-release redesign that turns the homepage from a "weather dashboard with widgets" into a **premium AI-native weather product**. Three pillars ship together: cinematic backgrounds, a new card/UI system, and AI woven into the main flow (not hidden in Explore).

---

## Pillar 1 — Hybrid Photoreal + WebGL Backgrounds

Replace `animated-weather-background.tsx` (current cartoon puffy clouds) with a layered renderer.

**Layer stack (bottom → top):**
1. **Photoreal sky base** — curated time-of-day sky photographs/videos per condition (clear-dawn, clear-day, golden-hour, blue-hour, overcast, storm, fog, snow, aurora). Single 1080p WebM/JPG per state, lazy-loaded, cross-faded on condition change.
2. **Parallax cloud plate** — 2–3 PNG layers drifting at different speeds based on real wind direction + speed.
3. **WebGL FX canvas** (`@react-three/fiber` v8 + drei v9) — particle systems for rain, snow, lightning flash, aurora ribbons, dust, lens flare. Auto-pauses when tab hidden or `prefers-reduced-motion`.
4. **Atmospheric color grade** — CSS blend layer tinted by sun elevation (uses existing `useTimeOfDay`).

**Performance budget:** <2.5 MB initial, ≤60 fps on iPhone 12, hard fallback to a static gradient if WebGL unavailable or `navigator.gpu`-style adapter check fails. Battery saver mode disables WebGL FX entirely.

**New files:**
```
src/components/backgrounds/
├── sky-renderer.tsx          // orchestrator, picks layers from condition+time
├── photo-sky-layer.tsx       // image/video crossfade base
├── parallax-clouds.tsx       // CSS-transform cloud plates
├── webgl-fx-canvas.tsx       // r3f canvas with conditional FX
├── fx/rain-particles.tsx
├── fx/snow-particles.tsx
├── fx/lightning.tsx
├── fx/aurora.tsx
└── assets/skies/*.{jpg,webm}
```

---

## Pillar 2 — New Card System & UI Language

**Aesthetic:** Premium dark glass — deep navy base (`#0b1628 → #152340`), liquid-glass cards over the photoreal sky, blue accent (`#3b6fa0 → #7ba8d9`), confident shadows, generous spacing.

**Card primitive overhaul** — one new `<RainzCard />` replacing the current ad-hoc `glass-card` classes:
- Variants: `hero`, `metric`, `timeline`, `ai`, `compact`
- Built-in title slot, optional AI shimmer border, optional accent glow per condition
- Rounded `1.5rem`, blur `28px` saturate `170%`, 1px gradient border, subtle inner highlight
- Removes the inconsistent glass treatments across `current-weather`, `aqi-card`, `pollen-card`, `barometer-card`, etc.

**Typography refresh:** Display headline in a distinctive sans (Geist / Söhne-style) at 56–72 px for hero numbers; body stays Lato. Mono for data labels.

**Homepage layout (mobile-first, since current viewport is 375):**
```text
┌─────────────────────────────┐
│ ⛅  Location ▾    ⚙ 🛰     │  header chips (glass)
├─────────────────────────────┤
│  AI BRIEFING HERO           │  pillar 3 #1
│  "Mild morning, rain by 4." │
│  72°  feels 70  ↓ details   │
├─────────────────────────────┤
│  ASK RAINZ ▸                │  pillar 3 #2
│  [chip] [chip] [chip]       │
├─────────────────────────────┤
│  PREDICTIVE TIMELINE        │  pillar 3 #3
│  ───●──────●──────●──       │
├─────────────────────────────┤
│  SMART PLAN CARDS  →        │  pillar 3 #4
│  [Outfit] [Run] [Commute]   │
├─────────────────────────────┤
│  Metrics grid (2×3)         │  AQI / UV / Wind / Pollen / Barometer / Rainz Score
├─────────────────────────────┤
│  10-day forecast            │
└─────────────────────────────┘
```

**Removed from the homepage** (moved to Explore or settings): rain-map preview, social-weather-card, weather-fun-facts, deja-vu card, mood journal, debate arena, photo challenge, weekly-recap inline card. Homepage stops being a "feature dump".

**Bottom tab bar:** restyled with the new glass primitive + a subtle AI status dot (pulses while the briefing streams).

---

## Pillar 3 — AI on the Homepage

All four AI surfaces you picked, all on `/index`, all streaming via Groq through edge functions (per memory: never Lovable AI). Graceful fallback to raw API data if the LLM call fails.

### 3.1 AI Briefing Hero
Replaces the static current-weather block. A 2–4 sentence personalized briefing streams in (token-by-token, with cursor) using: location, current conditions, next 12 h forecast, time of day, and (if signed-in) saved locations as context. Voice playback button (Web Speech API). Refreshes on pull-to-refresh and every 30 min.

**New edge function:** `supabase/functions/ai-briefing/index.ts` — Groq llama-3.3-70b, streams SSE, ≤120 tokens, system prompt enforces Scandinavian-friendly tone (target 13–35 yo).

### 3.2 Ask Rainz Inline
Persistent input bar under the hero: "Ask about today's weather…". Tapping opens an inline expanded chat panel (not a modal) with streaming markdown answers and 4 rotating suggestion chips ("Will it rain on my walk home?", "Wind for cycling?", "When's golden hour?", "Compare to yesterday"). History kept in-session only.

**Reuses** existing `ai-weather-companion.tsx` logic but rewritten as inline component `<AskRainzInline />`.

### 3.3 Predictive Timeline
Replaces the hourly carousel. A horizontal scrubbable timeline shows the next 12 h with AI-detected key moments annotated: "☔ Rain at 15:40", "🌅 Sun returns 17:10", "💨 Gusts peak 19:00". Tap a moment to expand a detail bubble.

**New edge function:** `ai-timeline-moments` — takes hourly array, returns array `{ time, icon, label, severity }`. Uses Groq with structured tool-call output.

### 3.4 Smart Plan Cards
Horizontal scroll of 3–5 personal cards generated server-side once per refresh:
- **Outfit** — what to wear (image + text)
- **Best window** — best 2 h block to go out today
- **Activity score** — Run / Bike / Walk subscored 0–100 with one-line reason
- **Commute** — if user has a saved location, AM/PM commute weather diff

**New edge function:** `ai-smart-plans` — single call returning all cards as JSON via tool calling. Cached 30 min per location.

---

## Pillar 4 — UI System Cleanup (cross-cutting)

- New `tailwind.config.ts` tokens: `rainz-ink` (deep navy), `rainz-glass`, `rainz-glow`, `rainz-ai` (animated gradient).
- New `index.css` semantic tokens for the dark-glass system; light mode kept but re-tuned against photoreal skies (auto-darkens overlays).
- New shared components in `src/components/rainz/`: `RainzCard`, `RainzChip`, `RainzMetric`, `StreamingText`, `AIShimmerBorder`, `SoftDivider`.
- Settings dialog, location picker, header info bar restyled to the new primitives (no functional change).
- Search bar (just redesigned) absorbs the new glass tokens for consistency.

---

## Technical Notes

- **r3f versions pinned**: `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`, `three@>=0.133` (React 18 constraint).
- **LLM**: Groq primary, OpenAI fallback, raw API fallback (per existing memory). Never Lovable AI.
- **Streaming**: SSE through edge functions, parsed with the line-by-line pattern (no `\n\n` splits).
- **Caching**: Briefing 30 min, plans 30 min, timeline 1 h, all keyed by location+conditionHash.
- **Reduced motion + battery saver**: disables WebGL FX, falls back to static photo + gradient.
- **A11y**: AI streams have `aria-live="polite"`, voice control respects user setting, all glass cards keep AA contrast.
- **Memory updates**: refresh "Animated Bgs" memory after Pillar 1, add a "Rainz 2.0 UI" memory after Pillar 2, add "Homepage AI surfaces" memory after Pillar 3.

---

## Implementation Order (single release branch)

1. Design tokens + `RainzCard` primitives (no visual change yet).
2. Background renderer (photoreal + WebGL FX) behind a feature flag.
3. New homepage shell + relocate non-essential cards to Explore.
4. AI Briefing hero + edge function.
5. Predictive timeline + edge function.
6. Smart plan cards + edge function.
7. Ask Rainz inline.
8. Restyle settings/header/tab bar to new system.
9. Flip the flag, ship 2.0, update memories.

---

## Out of Scope (deliberately)

- No changes to Predict, Battles, Shop, Leaderboard internals (only visual restyle later if time allows).
- No new auth, payments, or backend schema beyond the 3 new edge functions.
- No native app rebuild — Capacitor wrapper inherits the new UI automatically.
- No new languages.
