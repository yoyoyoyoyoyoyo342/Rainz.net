## Objective
Restyle the Location Search card so it visually matches the other “glass-card” cards (same color/transparency), removes the large header strip, avoids the “card inside a card” feel, and keeps 100% of the existing search/detect/history/results functionality.

## Current state (what’s causing the issue)
- `src/components/weather/location-search.tsx` currently renders an outer `div` with `glass-card` and then a dedicated header block (`p-4 border-b ...`) that visually reads like an “inner card/header panel”.
- The search results dropdown also introduces extra separators/backgrounds (`bg-muted/30`, `border-t`, etc.) which can feel like nested panels.

## Approach
### 1) Match the card shell used across the app
- Ensure the outer wrapper matches the standard pattern:
  - `className="glass-card overflow-hidden rounded-2xl border border-border/30 backdrop-blur-xl shadow-md"` (exact border/shadow values will be aligned with whichever is used most consistently in other cards).
- Keep sizing/z-index behavior the same (`flex-1 max-w-md z-[9999]`) so no functional/layout regression.

### 2) Remove the “big header” without removing useful context
- Delete the separate header block entirely.
- Replace it with a minimal, inline label row inside the content area:
  - A small “Search” label (text-xs / text-sm) above the input OR no label at all and rely on placeholder.
  - Optionally keep a small Search icon inside the input on the left (subtle, not a header bar).

### 3) Make the input row feel like the other cards
- Keep one main padded content container (e.g. `p-4`).
- Input styling:
  - Use the same translucent surface used elsewhere: `bg-muted/30 border border-border/30 rounded-xl`.
  - Keep focus ring behavior already present.
- Keep the “use my location” button as an icon button inside the input (current behavior is good), but adjust hover/fill to match the glass theme.

### 4) Reduce “inner card” feeling in the dropdown
- Keep dropdown attached, but visually treat it as part of the same card:
  - Remove hard section headers with solid fills.
  - Replace `bg-muted/30` section bars (e.g., “Recent Searches”) with a lighter treatment: `text-xs text-muted-foreground px-4 py-2` without a background, or a very subtle `bg-muted/10`.
  - Use consistent dividers: `border-border/20`.
  - Ensure list items use a consistent hover: `hover:bg-muted/20`.
- Ensure the dropdown uses the same corner rounding and doesn’t create a second “box” inside the first.

### 5) Verify no behavior changes
We will not change any of:
- Debounce/search logic and queries
- Address geocoding invocation
- Nearby station selection flow
- Search history read/write/delete
- Toasts and analytics tracking
- Focus/blur timing (keeps dropdown usable on mobile)

## Files to edit
- `src/components/weather/location-search.tsx`
  - Remove header block
  - Update outer wrapper classes to match the common glass shell
  - Adjust internal spacing and dropdown section styles

## Testing checklist
- Desktop:
  - Typing shows location results and address results
  - Clicking a result selects location and closes dropdown
  - Recent searches appear on focus (empty query)
  - Delete history item works and does not select item
- Mobile:
  - “Use my current location” button still works (mouseDown preventDefault preserved)
  - Dropdown remains tappable (blur delay still works)
- Visual:
  - Card matches other glass cards for color/transparency
  - No prominent header strip
  - Dropdown feels integrated, not like a nested card

## Notes / design guardrails
- You asked for “same layout and colour as the other cards” and “no big headers”. We’ll follow the more minimal cards pattern: single padded body, subtle typography, integrated dropdown.
- If we need an exact reference card, we’ll match whichever card you consider the canonical style (Snow Index or another). If Snow Index is the reference but you don’t want its header style, we’ll match its glass surface + spacing but remove the header bar.