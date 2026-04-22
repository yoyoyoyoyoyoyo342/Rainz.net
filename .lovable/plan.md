

## Instagram-style Feed Algorithm + Social Notifications + Profile Pictures

### 1. Instagram-style ranking algorithm for social feed

Replace the current chronological-only feed in `src/components/weather/social-feed.tsx` (and any `Social` page feed) with a weighted ranking score computed client-side after fetching candidate posts.

**Score formula** (per post):
```
score = (likes * 3) + (comments * 5) + (isFollowed ? 50 : 0) + (isSameLocation ? 20 : 0) + recencyBoost
recencyBoost = max(0, 100 - hoursSincePost * 2)   // decays over ~50h
```

**Fetch strategy:**
- Pull last 200 posts from `social_posts` (RLS already allows all authenticated reads).
- Pull `user_follows` rows for current user (to flag followed authors with +50 boost).
- Compute score in JS, sort descending, slice top 50.
- Inject 1 post from a non-followed user every 5 posts (discovery slot) so the feed isn't an echo chamber.

No DB changes needed — algorithm is pure client-side and can be tuned without migrations.

### 2. Inbox notifications for social events

Currently `notify_on_inbox_insert` trigger sends a push when a row is inserted into the inbox table. We'll piggyback on this: insert inbox rows from DB triggers on three events.

**New triggers (migration):**

a) **On new post by followed user** → notify all followers
- Trigger on `social_posts AFTER INSERT`
- Function loops through `user_follows` where `following_id = NEW.user_id` and inserts inbox rows for each follower.
- Title: `"{display_name} just posted"`, type: `social_post`.

b) **On new follow** → notify the user being followed
- Trigger on `user_follows AFTER INSERT`
- Inserts one inbox row for `NEW.following_id`.
- Title: `"{follower_display_name} started following you"`, type: `social_follow`.

c) **On new comment** → notify the post author (skip if commenting on own post)
- Trigger on `social_post_comments AFTER INSERT`
- Looks up `social_posts.user_id` for `NEW.post_id`, inserts inbox row for that user if it differs from `NEW.user_id`.
- Title: `"{commenter_display_name} commented on your post"`, type: `social_comment`.

All three functions use `SECURITY DEFINER` and read `display_name` from `profiles`. Existing push-notification trigger fires automatically once the inbox row lands.

**Inbox table check needed:** Inspect actual inbox table name during implementation (likely `notifications` or `inbox_notifications` based on `notify_on_inbox_insert` function — confirmed during code phase).

### 3. Profile pictures on leaderboard + posts

**Leaderboard** (`src/components/weather/leaderboard.tsx` and related):
- Update `get_leaderboard()` and `get_monthly_leaderboard()` SQL functions to return `avatar_url` from `profiles`.
- Render `<Avatar>` (already exists at `src/components/ui/avatar.tsx`) next to each user's display name with `<AvatarImage src={avatar_url} />` and a fallback initial.

**Social feed posts** (`src/components/weather/social-feed.tsx`, and any post card components):
- Extend the profile join to also select `avatar_url`.
- Render `<Avatar className="h-8 w-8">` to the left of each post's display name.
- Same for the existing `weather-reactions-feed.tsx` if it shows authors.

### Files to modify
- `src/components/weather/social-feed.tsx` — algorithm + avatars
- `src/components/weather/leaderboard.tsx` — avatar column
- `src/pages/Social.tsx` (if it has its own feed render) — algorithm + avatars
- `src/components/weather/weather-reactions-feed.tsx` — avatars (if applicable)

### Database migration
- Update `get_leaderboard()` and `get_monthly_leaderboard()` to include `avatar_url`.
- Three new triggers + functions for social_posts / user_follows / social_post_comments → inbox inserts.

### Out of scope
- No changes to push notification delivery itself (existing trigger handles it).
- No new UI for notification preferences (uses existing inbox).
- No paid boost / promoted posts.
- Algorithm weights are starting values — easy to tune later.

