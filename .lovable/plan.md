

## Plan: Bottom Navigation Bar Overhaul + Saved Locations in Main Card

### Summary
Replace the current scrollable location-based bottom navbar with a fixed 4-tab navigation bar (Home, Predict, Social, Explore). Move saved locations into the main weather card as a horizontal chip selector. Remove the Social Feed card from the homepage and remove followers' predictions from the social feed.

---

### 1. New Bottom Tab Bar Component

**Create `src/components/weather/bottom-tab-bar.tsx`**

A fixed 4-tab navigation bar — no scrolling, all icons + labels visible at once on 375px:

| Tab | Icon | Action |
|-----|------|--------|
| Home | `CloudSun` (cloud + house hybrid) | Scrolls to top / default view |
| Predict | `Target` | Opens PredictionDialog |
| Social | `Bell` | Opens Social tab (notifications + posts) |
| Explore | `Compass` | Opens Explore sheet |

- Fixed to bottom, full-width grid of 4 equal columns
- Glass card styling, no horizontal scroll
- Active tab highlighted with primary color
- No "Add" button, no location pills

### 2. Saved Locations in Main Card

**Edit `src/pages/Weather.tsx`**

Add a horizontal scrollable chip row inside the main card (below the location search, ~line 667) showing saved locations as tappable pills. Clicking one switches to that location. Current location gets a highlighted ring.

### 3. Remove Social Feed from Homepage

**Edit `src/pages/Weather.tsx`**
- Remove `<SocialFeed isImperial={isImperial} />` (line 764)
- The Social Feed content moves into the Social tab view

### 4. Social Tab Content

**Create `src/components/weather/social-tab.tsx`**

A full-screen overlay/sheet triggered by the Social tab containing:
- **Notifications** — user's inbox (existing notification queries from `user_notifications`)
- **Post creation** — text + optional image posts (new `social_posts` table)
- **Feed** — posts from followed users only (no predictions shown)

### 5. Remove Followers' Predictions from Social Feed

**Edit `src/components/weather/social-feed.tsx`**
- This component currently shows followed users' predictions — it will be repurposed or removed since the Social tab replaces it with text/image posts instead

### 6. Replace MobileLocationNav Usage

**Edit `src/pages/Weather.tsx`**
- Replace `<MobileLocationNav>` render (~line 993) with the new `<BottomTabBar>`
- Pass callbacks for each tab action (predict dialog open, social open, explore open)

### 7. Database Migration

**New table `social_posts`** for text/image posts:
```sql
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  location_name text
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
-- Users can read posts from people they follow
-- Users can insert their own posts
```

---

### Technical Details

| Change | Files |
|--------|-------|
| Bottom tab bar | New: `bottom-tab-bar.tsx` |
| Social tab | New: `social-tab.tsx` |
| Saved location chips | Edit: `Weather.tsx` (add chips in main card) |
| Remove social feed | Edit: `Weather.tsx` (remove `<SocialFeed>`) |
| Replace mobile nav | Edit: `Weather.tsx` (swap `MobileLocationNav` → `BottomTabBar`) |
| Social posts table | New migration |

### Execution Order
1. Create `bottom-tab-bar.tsx` (4-tab fixed nav)
2. Create `social-tab.tsx` (notifications + posts feed)
3. DB migration for `social_posts`
4. Edit `Weather.tsx` — add saved location chips, remove SocialFeed, swap navbar
5. Verify build

