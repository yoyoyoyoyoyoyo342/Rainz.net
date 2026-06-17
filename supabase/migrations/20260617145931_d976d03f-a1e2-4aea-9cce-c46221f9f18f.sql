INSERT INTO public.blog_posts (title, slug, excerpt, content, author_id, is_published, published_at, cover_image_url)
VALUES (
  'Rejn 2.0 — Smarter Skies, Cleaner App',
  'rejn-2-0-whats-new',
  'A stronger AI layer, a redesigned hero, a fixed Predict tab, and a Claude-style Ask Rejn experience — here is everything we shipped in Rejn 2.0.',
  $md$# Rejn 2.0 — Smarter Skies, Cleaner App

Rejn is the free weather app built for people who actually *go outside* — students biking to class in Oslo, friends planning a weekend in Copenhagen, runners in Stockholm chasing the dry windows between showers. Rejn 2.0 is our biggest update yet: smarter AI, a cleaner home screen, and a long list of fixes from your feedback.

No ads. No paywalls. Still completely free.

## ✨ What's new

### AI Sky Analyst — rebuilt around Ask Rejn
We rebuilt the chat experience to feel like a real assistant instead of a pop-up.

- **Claude-style sidebar** with your chats grouped by Today, Yesterday, last 7 days, last 30 days, and older.
- **Search** across your past conversations.
- **One-tap delete** on any chat (hover or long-press).
- **Prominent "New chat" button** at the top of the sidebar.
- Removed the pointless back arrow at the top of the AI tab — it never went anywhere useful.
- Existing chat history was wiped so everyone starts 2.0 with a clean slate.

### Weather Calendar
A 15-day forecast you can sync straight to Apple Calendar or Google Calendar. Plan trips, training, and festivals around the actual weather.

### Predictive Timeline
See the next weather shifts coming before they hit — when the wind turns, when the rain starts, when it finally clears.

### Smart Outfit
Faster, sharper clothing guidance for the conditions you're actually walking into.

### Route Sense
Spot the cleaner travel windows at a glance, powered by the same engine behind DryRoutes.

### AI Certainty score
Every day in the forecast now ships with a confidence-style certainty score so you know when to trust the model and when to keep an umbrella handy.

## 🎨 Homepage & hero redesign

- A new **AI Briefing hero card** anchors the home screen.
- The **streak counter is back**, redesigned as a glowing flame badge inside the hero so it's actually visible without taking over the layout.
- **Saved locations** moved out of the hero pills into a layout that fits the new look — cleaner, less noisy, easier to scan.
- The briefing CTA now reads **"View full briefing"** instead of the old "Full morning review →".

## 🛠️ Fixes

- **Predict tab is fully working again.** The prediction form wasn't rendering for some users — it's back, so you can keep your streak alive.
- Various visual polish across the hero, navbar, and AI tab.

## ⚙️ Under the hood

- **Path-based routing on rejn.app.** The old wildcard subdomain setup (`*.rainz.net`, `*.rejn.app`) has been retired. Every page now lives at a clean path like `rejn.app/predict` or `rejn.app/weather/oslo`. Old subdomains 301 to the apex automatically. (Beta subdomains stay where they are.)
- Smaller stability and performance improvements across the app.

## 📲 What's next

We're already working on the next wave — deeper personalisation, more hyperlocal data, and tighter Apple/Android integrations. Got an idea? Drop it in the in-app feature ideas board.

Welcome to Rejn 2.0. Stay dry out there.
$md$,
  '7ac7d2c8-684e-4122-90e8-742b1a0e427e',
  true,
  now(),
  NULL
);