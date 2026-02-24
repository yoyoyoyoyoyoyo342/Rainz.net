

# Fix Battle Accept Black Screen

## Root Cause

When clicking "Accept" on a battle notification, the flow is:
1. Notification is deleted from DB
2. Inbox popover closes (unmounting the button component)
3. After a 350ms delay, a Radix Dialog opens with `modal={true}`

The black screen happens because:
- The Dialog overlay renders at `z-50` with `bg-black/80` (the black screen)
- The Dialog content should appear on top, but it can fail to render properly when opened via a delayed `setTimeout` after a popover unmounts
- Both `onPointerDownOutside` and `onInteractOutside` have `preventDefault()`, so the user **cannot dismiss** the overlay by clicking outside -- they're trapped on a black screen
- If the battle has expired or the status is no longer "pending", the dialog closes, but there can be a flash of black overlay before the toast appears

## The Fix: Replace Dialog with Page-Level Navigation

Instead of fighting Radix Dialog/Popover layering conflicts, use a completely different approach. Navigate the user to the weather page with battle parameters in the URL, then show the prediction form inline -- no dialog needed.

### New Flow

1. User clicks "Accept" on battle notification
2. Notification is deleted
3. Inbox popover closes
4. App navigates to `/?accept_battle=BATTLE_ID`
5. The Weather page detects the `accept_battle` query param
6. A full-width battle acceptance card appears at the top of the page with the prediction form
7. After submitting, the query param is cleared and a success message is shown

This approach eliminates:
- Dialog/popover z-index conflicts
- Focus trap issues
- The need for `setTimeout` hacks
- Any possibility of a black screen overlay trapping users

### Fallback: Keep Dialog but Make it Safe

If the navigation approach feels too disruptive, an alternative is to fix the existing dialog by:
- Removing `onPointerDownOutside` and `onInteractOutside` `preventDefault()` so users can always dismiss
- Adding `z-[200]` to the DialogOverlay as well (not just the content)
- Adding a large, visible "Cancel" button in the dialog footer
- Adding an `onError` boundary around `WeatherPredictionForm` inside the dialog

## Recommended Approach: Navigation-Based (Option 1)

This is the most robust solution. No more layering bugs.

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/weather/notification-battle-actions.tsx` | Replace `openBattleAcceptDialog` call with `useNavigate()` to `/?accept_battle=BATTLE_ID` |
| Edit | `src/pages/Weather.tsx` | Detect `accept_battle` query param, fetch battle details, show inline prediction form card at top of page |
| Edit | `src/contexts/battle-accept-dialog-context.tsx` | Remove the Dialog component entirely, keep only the context provider (or remove the file if no longer needed) |
| Edit | `src/App.tsx` | Remove `BattleAcceptDialogProvider` wrapper if the context file is fully removed |

## Technical Details

### notification-battle-actions.tsx changes

Replace the `setTimeout + openBattleAcceptDialog` pattern with:
```text
import { useNavigate } from "react-router-dom";

// Inside handleAcceptClick:
onRequestCloseParent?.();
onActionComplete?.();
navigate(`/?accept_battle=${battleId}`);
```

No timeout needed. Navigation happens after popover closes naturally.

### Weather.tsx changes

At the top of the Weather page component:
```text
const searchParams = new URLSearchParams(window.location.search);
const acceptBattleId = searchParams.get("accept_battle");
```

When `acceptBattleId` is present:
1. Fetch battle details from `prediction_battles` table
2. Verify status is "pending" (show toast and clear param if expired)
3. Render a highlighted card at the top of the page with a Swords icon, battle info, and the `WeatherPredictionForm` pre-configured for that location
4. On successful prediction submission, call `acceptBattle()`, clear the query param, and show success toast

### Removing the Dialog context

The `BattleAcceptDialogProvider` and its Dialog can be fully removed since the accept flow now lives in the Weather page. The context file can either be deleted or gutted to just re-export a no-op for backward compatibility.

