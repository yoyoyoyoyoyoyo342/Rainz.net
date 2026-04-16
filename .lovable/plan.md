

## Plan: Product Hunt Launch Readiness — 4 Features

### 1. Onboarding Tooltip Tour (new users)

**What**: A 3-step floating tooltip tour for first-time visitors (no account required) highlighting Predictions, DryRoutes, and the Social Feed. Shows once per device.

**Implementation**:
- Create `src/components/weather/onboarding-tour.tsx` — a lightweight tooltip overlay using absolute positioning and Framer Motion. Steps:
  1. "Make weather predictions and compete" → points at the Predict button area
  2. "Plan dry walking routes" → points at the DryRoutes card
  3. "See what others are posting" → points at the Social Feed
- Uses `localStorage('rainz-tour-complete')` to show only once
- Renders inside `Weather.tsx` after weather data loads, only if tour not completed
- Each step has "Next" / "Skip" / "Done" buttons
- Semi-transparent backdrop with a cutout highlight effect (CSS box-shadow trick)

### 2. "Challenge a Friend" Deeplink

**What**: A shareable URL (`rainz.net/?accept_battle=<id>`) that works in WhatsApp/iMessage. The existing `accept_battle` param already handles battle acceptance — we just need a **share button** that generates and copies this link.

**Implementation**:
- In `src/components/weather/prediction-battles.tsx`, add a "Share Challenge" button next to each pending battle the user created
- Uses `navigator.share()` with fallback to `navigator.clipboard.writeText()`
- Share text: "I challenged you to a weather prediction battle on Rainz! 🌧️" + URL
- The URL is `https://rainz.net/?accept_battle=<battle_id>`
- Also add share button in `weather-prediction-form.tsx` after a battle is created (the `createBattle` flow)

### 3. First Prediction Bonus (500 SP)

**What**: New users who make their first prediction within 24h of signup get 500 bonus SP.

**Implementation**:
- **DB migration**: Add column `first_prediction_bonus_claimed boolean DEFAULT false` to `profiles` table
- In `weather-prediction-form.tsx`, after a successful prediction insert, check:
  1. User's `created_at` from auth is within 24h of now
  2. This is their first prediction (count = 1)
  3. `first_prediction_bonus_claimed` is false
- If all true: update profiles `total_points += 500` and set `first_prediction_bonus_claimed = true`, insert a notification, show a celebratory toast
- Add a small badge/banner in the prediction dialog: "🎁 Make your first prediction within 24h for 500 bonus points!"

### 4. Performance Audit & LCP Optimization

**What**: Ensure LCP < 2s on mobile for PH judges.

**Implementation**:
- **Preload critical fonts**: Add `<link rel="preload">` for Inter in `index.html`
- **Defer non-critical JS**: Verify all below-fold components use `lazy()` (already done for most)
- **Image optimization**: Add `loading="lazy"` and explicit `width`/`height` to the PH badge in footer
- **Reduce main bundle**: Check if any heavy imports (date-fns, framer-motion) can be tree-shaken or lazy-loaded more aggressively
- **DNS prefetch**: Add `<link rel="dns-prefetch">` for `ohwtbkudpkfbakynikyj.supabase.co` and `api.open-meteo.com` in `index.html`
- **Service worker**: Verify `sw.js` network-first strategy doesn't block initial paint

---

### Technical Details

| Feature | Files Created/Modified |
|---|---|
| Tooltip Tour | New: `onboarding-tour.tsx`. Modified: `Weather.tsx` |
| Challenge Deeplink | Modified: `prediction-battles.tsx`, `weather-prediction-form.tsx` |
| First Prediction Bonus | Migration: `profiles` table. Modified: `weather-prediction-form.tsx`, `prediction-dialog.tsx` |
| Performance | Modified: `index.html`, `footer.tsx` |

### Execution Order
1. Performance audit (quick wins, foundational)
2. First prediction bonus (DB migration first)
3. Challenge a friend deeplink (small, high-impact)
4. Onboarding tooltip tour (largest, most visible)

