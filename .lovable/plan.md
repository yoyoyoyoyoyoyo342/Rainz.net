

# Apple Liquid Glass for Apple Devices

## Overview
Apply Apple's Liquid Glass design language across the entire app, but **only on Apple devices** (iPhone, iPad, Mac Safari). Non-Apple devices keep the current design unchanged. Add an Apple credit to the Terms of Service.

## 1. Apple Device Detection Utility
**File**: `src/lib/pwa-utils.ts` (extend) + new `src/hooks/use-apple-device.tsx`

- Add `isAppleDevice()` function that detects iOS, iPadOS, and macOS Safari via user-agent
- Create a React hook `useIsAppleDevice()` that returns a boolean and a context provider `AppleGlassProvider` that wraps the app, setting a CSS class `apple-glass` on `<html>` when on Apple devices
- This allows all glass styles to be scoped under `.apple-glass` in CSS

## 2. Liquid Glass CSS System
**File**: `src/index.css`

Add an `.apple-glass` scoped layer with 6 component styles matching your Figma components:

| Figma Component | CSS Class | Applied To |
|---|---|---|
| Square glass | `.apple-glass .glass-card` | All weather cards, dialogs |
| Small circle | `.apple-glass .glass-circle` | Avatar bubbles, icon buttons (AI chat FAB, location icons) |
| Button/pill | `.apple-glass .glass-btn` | All `Button` default variant |
| Confirm button | `.apple-glass .glass-btn-confirm` | Primary/CTA buttons |
| Notification | `.apple-glass .glass-notification` | Toast components, emergency alerts |
| Tab bar | `.apple-glass .glass-tab-bar` | Bottom mobile nav bar |

Each style applies:
- `backdrop-filter: blur(40px) saturate(180%)` (heavier blur than current 12px)
- Tinted semi-transparent background with specular highlight (white inner glow at top edge)
- Subtle border with gradient from white/20 to white/5
- Multi-layer box-shadow for depth and refraction illusion
- The existing `GlassFilter` SVG filter from `liquid-glass-button.tsx` will be reused for the refraction distortion effect on buttons

## 3. Component Modifications

### Cards (`src/components/ui/card.tsx`)
- Wrap the existing `glass-card` class; on Apple devices the CSS override kicks in automatically via `.apple-glass .glass-card` — no React changes needed

### Buttons (`src/components/ui/liquid-glass-button.tsx`)
- Add `apple-glass` variant awareness: when on Apple device, the `LiquidButton` becomes the default for all buttons, applying the refraction SVG filter
- Standard `Button` gets the lighter glass-btn treatment via CSS class injection

### Bottom Tab Bar (`src/components/weather/mobile-location-nav.tsx`)
- Add `glass-tab-bar` class alongside existing `glass-card` on the nav container
- On Apple devices, CSS applies the heavier blur (40px), tinted background, and top-edge specular highlight matching Apple's tab bar style

### Toasts/Notifications (`src/components/ui/toast.tsx`)
- Add `glass-notification` class to the Toast component
- On Apple devices, overrides the solid background with translucent glass + blur

### Dialogs (`src/components/ui/dialog.tsx`)
- Add glass treatment to `DialogContent` — on Apple devices the overlay becomes more translucent and the content panel gets the glass card effect

### AI Chat FAB (`src/components/weather/ai-chat-button.tsx`)
- Add `glass-circle` class for the floating button — on Apple devices it gets circular glass with refraction

## 4. App Provider Integration
**File**: `src/App.tsx`

- Import and wrap root with `AppleGlassProvider` which sets `apple-glass` class on document element on mount (if Apple device detected)

## 5. Terms of Service Credit
**File**: `src/pages/TermsOfService.tsx`

Add a "Third-Party Design References" section:
> "Certain visual design elements on Apple devices are inspired by Apple's Liquid Glass design language, introduced in 2025. Apple, iPhone, iPad, and macOS are trademarks of Apple Inc. Rainz is not affiliated with or endorsed by Apple Inc."

## Files Changed

| File | Action |
|---|---|
| `src/lib/pwa-utils.ts` | Add `isAppleDevice()` function |
| `src/hooks/use-apple-device.tsx` | New — hook + context provider |
| `src/index.css` | Add `.apple-glass` scoped glass styles |
| `src/App.tsx` | Wrap with `AppleGlassProvider` |
| `src/components/ui/card.tsx` | No change needed (CSS handles it) |
| `src/components/ui/liquid-glass-button.tsx` | Minor: add glass-btn class |
| `src/components/ui/toast.tsx` | Add `glass-notification` class |
| `src/components/ui/dialog.tsx` | Add glass treatment class |
| `src/components/weather/mobile-location-nav.tsx` | Add `glass-tab-bar` class |
| `src/components/weather/ai-chat-button.tsx` | Add `glass-circle` class |
| `src/pages/TermsOfService.tsx` | Add Apple trademark credit |

