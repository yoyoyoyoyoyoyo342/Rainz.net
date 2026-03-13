

# Plan: Five Feature Additions for Rainz

## 1. Weather Alerts & Push Notifications

**Current state**: `usePushNotifications` hook exists with local notification support via service worker. No server-side push delivery or alert triggers exist.

**Changes**:

| Area | Work |
|------|------|
| **DB** | Create `push_subscriptions` table (user_id, endpoint, p256dh, auth, created_at) and `notification_preferences` columns or table for alert types (rain_soon, severe_weather, prediction_result) |
| **Edge function** `send-push-notification` | Accepts user_id + payload, looks up push subscription, sends via web-push using VAPID keys. Needs a new `VAPID_PRIVATE_KEY` secret |
| **Edge function** `check-weather-alerts` | Scheduled cron (every 15 min): fetches weather for users with subscriptions, triggers push if rain starts within 30 min or severe warning issued |
| **Verify-predictions hook** | After verification, call `send-push-notification` for the user with their result |
| **Frontend** | In settings dialog, add toggles for each alert type. On enabling, call `subscribeToPush()` and store the subscription in `push_subscriptions` table. Generate VAPID key pair and store private key as Supabase secret |

## 2. Social Features (Follow System + Friends Feed)

**Current state**: No follow/friend system exists. Prediction battles exist but are challenge-based, not feed-based.

**Changes**:

| Area | Work |
|------|------|
| **DB** | Create `user_follows` table (follower_id uuid, following_id uuid, created_at, unique constraint). RLS: users can manage their own follows, can read follows involving them |
| **DB** | Create `social_feed` view or query joining predictions + follows for feed display |
| **Component** `social-feed.tsx` | New card showing recent predictions from followed users, with accuracy badges |
| **Component** `follow-button.tsx` | Follow/unfollow toggle, used on user profiles and leaderboard entries |
| **UserProfile page** | Add follower/following counts, follow button for other users |
| **Prediction battles** | Add "Challenge" button next to followed users for quick battle initiation |
| **Leaderboard** | Add follow button next to each user row |

## 3. Route History & Playback (DryRoutes)

**Current state**: Saved routes are stored in localStorage as JSON with geometry arrays. No playback or timeline UI exists.

**Changes**:

| Area | Work |
|------|------|
| **DB** (optional) | Create `saved_routes` table to persist routes to account (user_id, name, geometry jsonb, distance, duration, transport_mode, created_at). Migrate from localStorage |
| **Component** `route-history-panel.tsx` | Timeline view of saved activities sorted by date, showing distance, duration, transport mode |
| **Playback feature** | "Play" button on each saved route: animates a marker along the route geometry at configurable speed (1x/2x/5x). Uses `requestAnimationFrame` + interpolation between geometry points. Shows elapsed time/distance counter |
| **DryRoute integration** | Add a "History" tab alongside Route/Track/Draw. When selecting a saved route, display it on map with playback controls (play/pause/reset/speed) |
| **Map animation** | Smooth marker movement using Leaflet's `setLatLng` with cubic interpolation. Optional polyline that draws progressively behind the marker |

## 4. Weekly Weather Recap

**Current state**: `weather-wrapped.tsx` exists as a full "Wrapped" dialog. The `weekly-recap` edge function sends basic in-app notifications. No visual recap card exists.

**Changes**:

| Area | Work |
|------|------|
| **Edge function** `weekly-recap` | Enhance to store structured recap data in a new `weekly_recaps` table (user_id, week_start, total_predictions, accuracy, points_earned, streak, highlights jsonb, created_at) |
| **Component** `weekly-recap-card.tsx` | Swipeable card stack (like Wrapped) with 4-5 slides: prediction accuracy ring chart, streak flame animation, points earned bar, top weather highlight, comparison vs previous week |
| **Weather page** | Show recap card at top of page on Mondays (or when new recap available), dismissible. Badge on explore button when unread |
| **Shareable** | "Share Recap" button generates a PNG using html-to-image (pattern already used in weather-wrapped.tsx) |

## 5. Widget Page Polish

**Current state**: `widget-generator.tsx` has basic config (theme/size/units/toggles) with live iframe preview and copy button. The `/widgets` page wraps it.

**Changes**:

| Area | Work |
|------|------|
| **Live preview** | Add auto-refresh on config change (debounced 500ms). Show loading skeleton while iframe loads |
| **Theme customization** | Add color accent picker, border-radius slider, font size option. Pass as URL params to widget |
| **Size presets** | Visual size preset cards (thumbnail previews) instead of dropdown. Click to select |
| **Responsive preview** | "Mobile / Tablet / Desktop" toggle that adjusts the preview container width |
| **Code output** | Add tabs for iframe / React component / script tag embed options. Syntax-highlighted code blocks |
| **Widget page** | Add "Popular Widgets" gallery section showing pre-configured examples users can start from |

## Implementation Priority

These are independent features. Recommended order by impact:

1. **Weekly Weather Recap** — builds on existing infra, high engagement value
2. **Widget Page Polish** — purely frontend, no DB changes
3. **Weather Alerts** — needs VAPID setup + edge function, medium complexity
4. **Route History & Playback** — complex animation work, localStorage→DB migration
5. **Social Features** — largest scope, new DB tables + multiple UI surfaces

## Files to Create/Modify

- **New DB tables**: `user_follows`, `push_subscriptions`, `saved_routes`, `weekly_recaps`
- **New edge functions**: `send-push-notification`, `check-weather-alerts`
- **New components**: `social-feed.tsx`, `follow-button.tsx`, `route-history-panel.tsx`, `weekly-recap-card.tsx`
- **Modified components**: `dry-route.tsx`, `widget-generator.tsx`, `leaderboard.tsx`, `settings-dialog.tsx`, `UserProfile.tsx`, `Weather.tsx`, `Widgets.tsx`
- **Modified edge functions**: `weekly-recap/index.ts`, `verify-predictions/index.ts`
- **New secret needed**: `VAPID_PRIVATE_KEY`

