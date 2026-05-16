# Predict v2 — New Features + Unified Tab Redesign

Two parallel tracks: (1) ship new "fun & game" mechanics on top of the predict flow, and (2) restyle every tab (Leaderboard, History, Shop, Battles) to match the new gradient‑hero language we just built on the Predict tab.

---

## Track 1 — New Fun Prediction Features

### 1. Daily Spin / Bonus Wheel 🎡
After submitting the day's prediction, a confetti modal opens with a 1‑tap "spin" that grants a random reward: +25 pts, double‑points token, streak shield, or a rare "All‑In refund" (gets back stake if All‑In fails). Once per day, server‑validated via a row in a new `daily_spins` table.

### 2. Prediction Streak Multiplier 🔥
Visible above the submit button: a meter that fills as your daily streak grows. Streak of 3 → +10% pts, 7 → +25%, 14 → +50%, 30 → +100%. Applied at verification time (server side) and previewed live on the submit button.

### 3. "Hot Streak" Power Card 🃏
A collectable card system using existing `active_powerups`. Earned via the Spin Wheel or 5‑in‑a‑row correct predictions. Three new cards:
- **Snowball** — next correct prediction's points double if previous was also correct.
- **Insurance** — if wrong, lose 50% less.
- **Underdog** — if you predict against the Rainz Bot and beat it, +150 bonus.

Cards displayed as a horizontal scroll above the form; tap to "equip" before submitting.

### 4. Public Predictions Feed 🌍
A new "Live" sub‑section under the hero showing the last 10 predictions made by anyone in the world (city, condition icon, confidence chip). Reuses `weather_predictions` + a Supabase realtime channel. Creates the FOMO loop the Predict tab is missing right now.

### 5. Mystery Location of the Day 🎲
Optional toggle on the form: "Predict for Today's Mystery City" (a deterministic daily pick across world capitals). Correct = +500 pts. Wrong = 0 (no penalty). Surfaces on a small marquee chip next to the location picker.

### 6. Confidence Meter Sound + Haptics
When user selects "All‑In", a deep haptic pulse fires (mobile) and the submit button briefly pulses red. Pure delight, no backend.

### 7. Achievement Pop‑Ups (already exist) → Resurfaced
Use the existing 32+ achievement system but trigger an inline toast‑style ribbon on the Predict hero when one unlocks, instead of relying on the profile page.

> **Notes:** All these features ship on the Predict tab inside the same hero/glass‑card style. Backend additions are minimal: one new `daily_spins` table + a `streak_bonus_pct` computed column on `weather_predictions` for transparency. No paid integrations.

---

## Track 2 — Tab Redesigns (visual language unified with new Predict hero)

The new visual language we just shipped on Predict:
- Gradient hero card with blur orb
- Pill chips for filters
- Rounded glass cards
- Sheet for "info" overlays
- Streak/rank pills in top‑right

Apply that everywhere:

### A. Leaderboard tab (`leaderboard.tsx`)
- **Hero:** "This Month's Champions" gradient card with the current month name, days remaining, and the user's own rank pill in the corner.
- **Monthly/All‑Time toggle:** turns into pill chips matching the location picker style (replaces the current shadcn Tabs).
- **Podium:** Top 3 displayed as a visual podium (gold/silver/bronze pedestals with avatars + trophy counts) above the list.
- **List rows:** glass cards with rank gradient bar on the left edge; tap → user profile. Highlight the signed‑in user with a primary‑colored ring.
- **You row:** sticky at the bottom of the viewport (like Duolingo) showing "Your rank: #42 — 12 to go to top 10".

### B. History tab (`points-history.tsx`)
- **Hero:** "Your Journey" — totals card with lifetime points, best month, win rate, longest streak as the 4 small stats inside the hero (same layout as the Predict hero).
- **Filter chips:** All / Predictions / Battles / Wins / Losses (pill chips).
- **Timeline:** vertical timeline with date headers; each event is a glass card showing condition icon, location, ±points badge, confidence multiplier. Win/loss color accent on the left edge.
- **Empty state:** illustrated cloud + "Make your first prediction" CTA → jumps back to Predict tab.

### C. Shop tab (`points-shop.tsx`)
- **Hero:** "Power‑Up Shop" — your SP balance huge, sparkline of recent earnings, "Earn more" button.
- **Category chips:** Power‑Ups / Streak Tools / Cosmetics / Bundles (replaces the existing tabs).
- **Item cards:** larger, with bold icon, name, short tagline, price, and an "Owned: x" badge. Featured item gets a gradient ribbon ("Best value").
- **Confirm dialog:** unified sheet with item recap + balance after purchase.

### D. Battles (`prediction-battles.tsx`)
- **Hero:** "Battle Arena" with active battles count + win rate pill.
- **Section chips:** Active / Open / History.
- **Battle cards:** opponent avatar vs your avatar with a versus glyph between, location, stakes, accept/view buttons; gradient based on status (open=blue, active=primary, won=green, lost=red).

### E. Bottom tab bar (Predict / Leaders / History / Shop)
- Same icons/labels; just add a tiny notification dot when something is unread (e.g. unread battle, achievement unlocked).

---

## Shared Components to Extract

To keep this DRY and ensure visual consistency, build these reusable bits up front:

```text
src/components/predict/
├── predict-hero.tsx        // gradient card + orb + slot for content
├── pill-chips.tsx          // horizontal scrollable pill selector
├── stat-pill.tsx           // streak/rank/info pills
└── glass-row.tsx           // list-row card with optional left accent bar
```

Both tracks consume these, guaranteeing the redesigned tabs and the new features feel like one product.

---

## Out of Scope
- Stripe/payment changes — Shop redesign is visual only, all packages stay.
- New languages/translations — strings stay English.
- DB schema beyond `daily_spins` table.
- Battle resolution logic — unchanged.

## Implementation Order
1. Extract shared components (predict-hero, pill-chips, stat-pill, glass-row).
2. Redesign Leaderboard, History, Shop, Battles using them (Track 2).
3. Ship Spin Wheel + Streak Multiplier (highest delight, lowest risk).
4. Ship Hot Streak Cards + Public Feed.
5. Ship Mystery Location + haptics/sound polish.
