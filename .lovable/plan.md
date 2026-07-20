# Rejn 2.1.1 — Vision Update polish

Four targeted fixes. All changes stay in vision/accessibility surface + one edge function column.

## 1. Switch to Atkinson Hyperlegible Next

`src/index.css`
- Replace the current `Atkinson+Hyperlegible` Google Fonts import with `Atkinson+Hyperlegible+Next:wght@400;500;600;700;800` (self-hosted via Google Fonts CSS2 endpoint). Keep the old family as a fallback for one release in case Next fails to load.

`src/styles/vision.css`
- Update `--aniridia-font` to `"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif`.
- Also apply the font (opt-in) to **Low Vision** and **Screen Reader** presets since it helps them too: add `html.low-vision, html.screen-reader { font-family: var(--aniridia-font); }` and toggle `low-vision` / `screen-reader` classes from `useVisionPreferences`.

## 2. Fix dialogs not appearing (Aniridia + others)

Root cause: on iOS Safari the `body::before` dimmer at `z-index:180` plus Radix's `data-radix-popper-content-wrapper` and vaul drawers occasionally stack the *content* underneath the *overlay* when `filter`/`backdrop-filter` is applied to `html`/`body`. The overlay renders, the content doesn't.

Fixes:
- `src/styles/vision.css`: remove the `body::before` dimmer entirely. Reintroduce brightness dimming as a **fixed sibling div** rendered from `VisionProvider` (portalled to `document.body`) with `pointer-events:none` and `z-index: 40` — well below Radix portals (`z-[5000]+`) but above page content.
- Remove `filter:` rules from `html.warm-filter body` and `html.cb-* body` when a Radix/Vaul portal is open. Do this by scoping filters to `html.warm-filter #root` / `html.cb-* #root` instead of `body`, so portals rendered as siblings of `#root` are unaffected.
- `src/components/ui/dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `alert-dialog.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `select.tsx`: verify overlays are z-[5000], content is z-[5001], and add `isolation: isolate` on the content wrapper so parent filter/transform contexts can't capture them.
- Add a Playwright verification step: open Settings, Vision panel, and Preset picker in each preset and screenshot to confirm the dialog is visible above the dimmer.

## 3. Cloud-sync vision preferences (local-first)

Keep `localStorage` as source of truth for speed and anonymous users. Add cloud sync for logged-in users.

Schema (Aiven, via migration):
```sql
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS vision_prefs jsonb;
```

Edge function `supabase/functions/user-preferences/index.ts`:
- Add `vision_prefs` to the `SELECT` list and to the `INSERT ... ON CONFLICT` upsert (COALESCE like the others).

Client `src/hooks/use-vision-preferences.tsx`:
- On mount: load from `localStorage` immediately (unchanged, prevents flash).
- If `useAuth().user` becomes available: fetch `vision_prefs` from `user-preferences` edge function. If newer than local (compare an `updatedAt` timestamp we add to the stored blob), overwrite local; otherwise push local up.
- On every `setPrefs`/`applyPreset`/`reset`: write local immediately, then debounce (500 ms) a PATCH to `user-preferences` when signed in.
- Anonymous users stay purely local.

## 4. Fix splash screen centering

Image 2 shows the logo/text pushed to the bottom. Cause: the inner `motion.div` has `mt-3` gaps plus the outer uses `min-h-dvh` inside `fixed inset-0`, which iOS Safari sometimes measures against the visual viewport (dvh > actual) — content overflows below the fold.

`src/components/ui/app-splash-screen.tsx`:
- Change outer to `fixed inset-0 z-[6000] grid place-items-center bg-background px-6 text-foreground` (drop `min-h-dvh`, `flex-col`, `justify-center`).
- Ensure the inner block uses `flex flex-col items-center gap-4` and no `mt-3`.
- Force `html.text-scale-125/150/200` and `html.aniridia` to not affect the splash: wrap splash content in a `text-scale-100`-scoped container with an explicit `style={{ fontSize: 16 }}` root so scaled font-size doesn't push layout inside the fixed viewport.

## Technical notes

- No new tables. Only one column added to existing `user_preferences`.
- No breaking API: `vision_prefs` is optional; missing = fall back to local.
- Vision CSS filters move from `body` → `#root` so Radix portals (siblings of `#root`) render clean.
- Dimmer becomes a portal div, not a pseudo-element, so it never becomes a stacking-context ancestor of dialogs.

## Verification

Playwright script across `standard`, `low-vision`, `aniridia`, `color-blind`, `screen-reader`:
1. Open `/`, screenshot splash — logo centered.
2. Open Settings dialog, screenshot — dialog visible above dimmer.
3. Change a vision toggle, reload signed-in — pref restored from cloud.
4. Toggle warm-filter + color-blind together — no invisible dialogs.
