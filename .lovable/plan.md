

## Problem

The Radix Dialog component is fundamentally incompatible with a fullscreen scrollable layout. Even with CSS overrides, the Dialog:
1. Uses `grid` display by default which can constrain content height
2. Has focus-trapping that interferes with touch scroll events
3. The `DialogOverlay` sits between the user and content, intercepting pointer events
4. Animation transforms (`zoom-out-95`, `slide-out`) conflict with the `translate-x-0 translate-y-0` overrides during open/close transitions

## Solution

**Replace the Radix Dialog with a simple fixed-position div** for the fullscreen view. This eliminates all the Dialog-related scroll/interaction conflicts.

### Changes to `src/components/weather/dry-route.tsx`

1. Remove `Dialog` and `DialogContent` imports
2. Replace the `<Dialog>` wrapper (lines 622-644) with a plain `<div>` using `fixed inset-0 z-50 bg-background overflow-y-auto` — a straightforward fullscreen overlay that scrolls natively
3. Add a `DialogTitle` (visually hidden) or remove the need entirely since we're no longer using Dialog
4. The close button and header already exist, so behavior stays identical

```text
Before:
  <Dialog open={isFullscreen} ...>
    <DialogContent className="fixed inset-0 ... overflow-y-auto">
      <div className="flex flex-col min-h-full">
        ...content...
      </div>
    </DialogContent>
  </Dialog>

After:
  <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
    <div className="flex flex-col min-h-full">
      ...content (unchanged)...
    </div>
  </div>
```

This is a minimal, targeted fix — same visual result, no scroll-blocking behavior.

