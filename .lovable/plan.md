# Rejn 2.0 Changelog Article

Write and publish a single article recapping everything shipped in the recent Rejn 2.0 push, then surface it in the blog.

## Where it lives
- Insert one row into `public.blog_posts` via a Supabase migration (same path the existing posts use).
- Status: `published`, `published_at = now()`, author = "Rejn Team", category "Product Updates", slug `rejn-2-0-whats-new`.
- Cover image: reuse an existing asset (e.g. `RejnMascot` hero) — no new image generated.

## Article outline
Title: **Rejn 2.0 — Smarter Skies, Cleaner App**

Sections:
1. **Intro** — why 2.0, who Rejn is for (13–35, Scandinavia), free forever.
2. **New features**
   - AI Sky Analyst (Ask Rejn) with Claude-style sidebar: date-grouped chats, search, delete, new-chat button, no more pointless back arrow.
   - Weather Calendar — 15-day forecast, Apple/Google export.
   - Predictive Timeline — upcoming weather shifts.
   - Smart Outfit guidance.
   - Route Sense — cleaner travel windows.
   - AI Certainty score on every day.
3. **Hero & homepage redesign**
   - New AI Briefing hero card.
   - Streak counter restored to the hero as a glowing flame badge.
   - Saved locations moved out of the hero into a cleaner layout that matches the new style.
   - Briefing CTA renamed to "View full briefing".
4. **Predict tab fixes**
   - Prediction form rendering bug squashed — users can predict again.
5. **Under the hood**
   - Path-based routing on `rejn.app` (wildcard subdomains retired, beta.* preserved).
   - Chat history wiped for a fresh start.
6. **What's next** — short teaser, link to `/info` and download.

## Steps
1. Create migration `supabase/migrations/<timestamp>_rejn_2_0_changelog_post.sql` that `INSERT`s the post (with markdown `content`, `excerpt`, `tags`, `cover_image_url`).
2. No UI changes — `Blog.tsx` already lists published posts and `BlogPost.tsx` renders them.

## Out of scope
- No new components, no design changes, no edits to existing pages.
- No image generation.
