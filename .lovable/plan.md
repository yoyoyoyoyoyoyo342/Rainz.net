

## Plan: Growth & Viral Features + Enhanced Amplitude Real-Time Tracking

### What We're Building

**1. Referral Program with Rewards**
- New `referrals` Supabase table tracking referrer/referee relationships
- Each user gets a unique referral code (stored in profiles)
- Shareable referral link (`rainz.net/?ref=CODE`) that awards points to both parties
- Referral dashboard showing stats (invited, joined, points earned)
- Track all referral events in Amplitude (`referral_link_shared`, `referral_signup_completed`)

**2. Shareable Weather Cards for Social Media**
- Enhance existing `SocialWeatherCard` with "Share to Instagram Stories", "Share to X/Twitter", "Copy Image" actions
- Generate branded OG-image-style cards with weather data + Rainz branding
- One-tap native share via Web Share API with fallback copy
- Amplitude tracking on every share action (`weather_card_shared`, platform, location)

**3. Embeddable Blog Widgets (Quick Share Snippet)**
- Add a "Get Embed Code" button on the weather page that generates a lightweight `<iframe>` snippet
- Links to existing `/embed` widget with pre-filled location
- Amplitude: `widget_embed_copied`

**4. Enhanced Real-Time Amplitude Tracking**
- **Funnel tracking**: Track user journey steps (landed → searched → viewed forecast → made prediction → shared)
- **Feature adoption**: Track which features users discover vs ignore (scroll depth, card visibility via IntersectionObserver)
- **Engagement scoring**: Compute and send user engagement level as Amplitude user property (casual/active/power)
- **Churn signals**: Track when users dismiss features, close dialogs early, or leave pages quickly
- **Real-time cohort properties**: Update user properties like `days_since_signup`, `prediction_count`, `share_count` on each session

### Technical Details

**Database Migration**
```sql
-- Referral tracking table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referee_id)
);

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
```

**New Files**
- `src/components/weather/referral-program.tsx` — Referral dashboard + share UI
- `src/hooks/use-referral.tsx` — Referral code generation, tracking, point awarding
- `src/hooks/use-amplitude-funnels.tsx` — Funnel tracking, feature adoption via IntersectionObserver, engagement scoring

**Modified Files**
- `src/pages/Auth.tsx` — Capture `?ref=` query param on signup, record referral
- `src/components/weather/social-weather-card.tsx` — Add platform-specific share buttons
- `src/hooks/use-amplitude-instrumentation.tsx` — Add scroll depth, visibility tracking, churn signals
- `src/pages/Weather.tsx` or `src/pages/Index.tsx` — Add referral card in Explore section
- `src/components/ui/footer.tsx` — Add "Refer a Friend" link

**Amplitude Events Added**
- `referral_link_shared`, `referral_link_clicked`, `referral_signup_completed`
- `weather_card_shared` (with platform property)
- `widget_embed_copied`
- `feature_visible` (per card, via IntersectionObserver)
- `scroll_depth_reached` (25%, 50%, 75%, 100%)
- `dialog_dismissed_early`, `session_engagement_score`
- User properties: `engagement_level`, `total_shares`, `referral_count`, `features_discovered`

### Implementation Order
1. Create referrals DB table + migration
2. Build referral hook and referral program component
3. Enhance social weather card sharing
4. Add Amplitude funnel/adoption/engagement tracking
5. Wire referral into Auth signup flow
6. Add navigation links (footer, explore section)

