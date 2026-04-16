

## Plan: Add Product Hunt Launch Banner

**What**: A dismissible banner at the very top of the Weather page (above the maintenance banner, line ~589) that promotes the April 17th Product Hunt launch with an upvote link. Auto-hides after April 17th ends (or a day or two after).

### Implementation

**1. Create `src/components/weather/producthunt-launch-banner.tsx`**
- Animated banner with 🚀 rocket icon and "We're live on Product Hunt!" message
- Links to `https://www.producthunt.com/posts/rainz-weather`
- Dismissible via X button (persisted to localStorage so it stays dismissed)
- Only visible on/around April 17, 2026 (show from April 16–18 to catch time zones)
- Orange/amber themed to match Product Hunt branding
- Framer Motion entrance/exit animation

**2. Edit `src/pages/Weather.tsx`**
- Import and render the banner inside the container div (line ~579), right before the battle accept card, so it sits at the top of the content area.

### Design
- Compact single-line banner on mobile (375px viewport)
- Product Hunt orange accent (`#FF6154`)
- "We're live on Product Hunt! Support us 🎉" with a CTA button "Upvote →"
- Dismiss persists via `localStorage.setItem('ph-launch-dismissed', 'true')`

