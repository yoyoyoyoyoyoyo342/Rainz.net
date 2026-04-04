

# Plan: Add `/airport` Landing Page Section (Oryzo.ai-inspired)

## Overview

Create a premium, visually striking marketing page at `/airport` inspired by oryzo.ai's playful, dark-themed aesthetic -- but adapted entirely for Rainz Weather. The page will have a sticky nav with links to sub-pages: `/airport/features`, `/airport/product`, and `/airport/contact`.

The oryzo.ai site is a tongue-in-cheek, over-engineered product page with sections like a hero with bold typography, animated feature cards, fake testimonials, pricing tiers, and a mock research paper. We will replicate this energy but for a weather app -- leaning into Rainz's personality for 13-35 year-old Scandinavians.

---

## Pages & Content Mapping

### `/airport` -- Main Landing (Hero + Overview)
- **Sticky nav bar**: Rainz logo + links (Intro, Features, Product, Contact)
- **Hero section**: Large bold text -- "Made for rain. Built for Scandinavia." with a tagline like "The world's most unnecessarily accurate weather app."
- **Video/image spotlight**: Rainz app screenshots using existing carousel images
- **"Isn't just a weather app" section**: Playful copy about AI-powered forecasts, gamification, and community
- **Animated stats**: "13+ weather sources", "50,000+ daily predictions", "99.2% uptime"
- **Testimonials section**: Fun fake/real user quotes with ratings (styled like oryzo.ai's review cards)
- **Social content grid**: Mosaic of app screenshots and feature highlights
- **Footer with links** back to main app

### `/airport/features` -- Feature Deep Dive
- Feature cards grid (similar to oryzo.ai's technical sections) covering:
  - Multi-source forecasts (ECMWF, GFS, DWD ICON etc.)
  - AI Weather Companion
  - Prediction Battles & Leaderboards
  - DryRoutes navigation
  - Pollen & Air Quality tracking
  - Weather games & achievements
- Each feature gets a bold title, playful description, and an illustrative icon or screenshot
- Styled with glassmorphism cards on dark background

### `/airport/product` -- Product/Pricing
- Three tier cards (like oryzo.ai's ORYZO / Pro / Pro Max):
  - **Rainz Free**: Core weather, predictions, leaderboard
  - **Rainz Premium**: AI companion, advanced maps, no ads, pollen
  - **Rainz API**: Developer access, MCP integration
- Comparison table below
- CTA buttons linking to `/auth` (sign up) and `/download`

### `/airport/contact` -- Contact Page
- Clean contact section with hello@rainz.net
- Social links
- Simple contact form (name, email, message) that could use the existing `send-feedback` edge function
- Office location: "Somewhere in Scandinavia, under a cloud"

---

## Technical Details

### New Files
1. **`src/pages/airport/AirportLayout.tsx`** -- Shared layout with sticky nav and footer for all `/airport/*` routes
2. **`src/pages/airport/AirportLanding.tsx`** -- Main `/airport` page
3. **`src/pages/airport/AirportFeatures.tsx`** -- `/airport/features`
4. **`src/pages/airport/AirportProduct.tsx`** -- `/airport/product`
5. **`src/pages/airport/AirportContact.tsx`** -- `/airport/contact`

### Modified Files
1. **`src/App.tsx`** -- Add 4 new lazy-loaded routes under `/airport/*`

### Design Approach
- Dark background (`bg-black` / `bg-zinc-950`) with white/light text -- matching oryzo.ai's dark aesthetic
- Large, bold serif or display typography for headlines
- Glassmorphism cards with subtle borders
- Smooth scroll animations using Framer Motion (already installed)
- Reuse existing assets: `rainz-logo-new.png`, `carousel-1.png` through `carousel-5.png`
- Responsive: mobile-first, works at the current 640px viewport
- No new dependencies needed -- Tailwind, Framer Motion, Lucide icons all already available

### Routing
```
/airport           -> AirportLanding
/airport/features  -> AirportFeatures
/airport/product   -> AirportProduct
/airport/contact   -> AirportContact
```

All wrapped in `AirportLayout` which provides the shared sticky nav and footer. The nav links use standard React Router `Link` components. The airport pages will NOT show the main app footer -- they have their own minimal footer.

