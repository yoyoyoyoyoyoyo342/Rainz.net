

# Plan: Emergency Alert System with App Lockdown

## What We're Building

A new "Emergency" tab in the admin panel that lets an admin:
1. Send a **red/destructive toast notification** to all users (shown immediately via Supabase Realtime)
2. Optionally **lock the entire app** so users see only a full-screen lockdown message and cannot navigate past it

## How It Works

### 1. New Feature Flag: `app_lockdown`
- Use the existing `feature_flags` table — add a row with key `app_lockdown` (default: disabled)
- When enabled, the app is locked

### 2. New DB Column on `broadcast_messages`
- Add `is_emergency boolean default false` — marks a message as a red/destructive alert
- Add `locks_app boolean default false` — when true, toggling this message also flips the `app_lockdown` feature flag

### 3. Admin "Emergency" Tab
- New component `AdminEmergencyAlert` rendered in the admin panel
- Text area for the emergency message
- Toggle: "Lock app (block all users from using the app)"
- "Send Emergency Alert" button (red/destructive styling)
- "Lift Lockdown" button that deactivates the emergency message and disables the `app_lockdown` flag
- Shows current lockdown status

### 4. Client-Side: Emergency Toast Display
- Update `useBroadcastListener` (currently unused — wire it into `App.tsx`)
- When an `is_emergency: true` message arrives, show it as `toast.error()` (red) instead of `toast.info()`
- Emergency toasts are non-dismissible (`duration: Infinity`, no close button)

### 5. Client-Side: App Lockdown Screen
- In `Weather.tsx` (and the `AppContent` wrapper in `App.tsx`), check the `app_lockdown` feature flag
- When active, render a full-screen overlay with the emergency message fetched from `broadcast_messages` where `locks_app = true AND is_active = true`
- The overlay blocks all interaction — no navigation, no scrolling, just the Rainz logo + red alert message
- Non-admin users see only the lockdown screen; admins can still access `/admin`

## Files to Change

| File | Change |
|------|--------|
| DB migration | Add `is_emergency` and `locks_app` columns to `broadcast_messages` |
| `src/components/weather/admin-emergency-alert.tsx` | **New** — emergency alert admin UI |
| `src/components/weather/admin-panel.tsx` | Add "Emergency" tab |
| `src/hooks/use-broadcast-listener.tsx` | Handle `is_emergency` flag, show red toasts |
| `src/App.tsx` | Wire `useBroadcastListener`, add lockdown overlay check |
| `src/components/ui/app-lockdown-screen.tsx` | **New** — full-screen lockdown component |

## Lockdown Flow

```text
Admin sends emergency + locks app
        │
        ▼
broadcast_messages row inserted (is_emergency=true, locks_app=true)
feature_flags 'app_lockdown' set to enabled
        │
        ├──► All clients: useBroadcastListener shows red toast
        └──► All clients: useFeatureFlags picks up app_lockdown=true
                  │
                  ▼
          AppContent renders <AppLockdownScreen /> 
          instead of normal routes
```

Admin lifts lockdown → sets `app_lockdown` flag to false, deactivates the broadcast message → app returns to normal.

