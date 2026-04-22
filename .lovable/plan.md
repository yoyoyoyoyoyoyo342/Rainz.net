

## Fix 4 Bugs: Spin Wheel, Social Feed, Clear Icon, Predict Options

### 1. Daily Spin Wheel — rewards not actually granted
**Problem:** In `daily-spin-wheel.tsx`, the spin record is inserted into `daily_spins` BEFORE `applyReward()` runs. The current `applyReward` does a select-then-update on `profiles.shop_points` / `total_points` — if either query fails silently (RLS, race, network), the user sees the win toast but no points are added. There's also no error feedback to the user.

**Fix:**
- Move `applyReward()` to run BEFORE recording the spin, and only insert into `daily_spins` after the reward is successfully applied.
- Replace the silent `console.error` with a `toast.error("Reward failed to apply — contact support")` so failures are visible.
- Wrap the profile update in proper error handling that throws on Supabase errors (currently `error` from `.update()` is discarded).
- Add a verification step: after updating, re-fetch the profile to confirm points changed; if not, retry once.

### 2. Social Feed — posts only visible to poster
**Problem:** The RLS SELECT policy on `public.social_posts` is:
```
user_id IN (followed users) OR user_id = auth.uid()
```
This is