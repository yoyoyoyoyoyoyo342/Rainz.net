

# SEO Improvement Plan for Rainz Weather

## Current State

You already have strong foundations: structured data (JSON-LD), 250 programmatic city pages, a detailed `llm.txt`, FAQ schema, and a comprehensive sitemap. The main gaps are around **crawlability of your SPA**, **dynamic content in the sitemap**, and **internal linking**.

---

## Plan

### 1. Add Pre-rendering for Search Engine Crawlers

**Problem**: Rainz is a React SPA — Google and Bing see a blank `<div id="root"></div>` until JavaScript executes. While Googlebot can render JS, it's slow, unreliable, and other engines (Bing, social crawlers) often can't.

**Solution**: Add a lightweight pre-rendering proxy via Vercel middleware or a service like [prerender.io](https://prerender.io). When a bot requests a page, it gets fully-rendered HTML.

- Update `vercel.json` to route bot user-agents to a pre-render endpoint
- Alternatively, add `react-snap` or `react-helmet-async` with a static pre-render build step that generates HTML snapshots for key pages (home, about, city pages, articles)
- This is the **single highest-impact SEO change** for a client-side rendered app

### 2. Dynamic Sitemap from Blog Posts

**Problem**: The sitemap is a static XML file — new blog posts aren't included, so Google doesn't discover them promptly.

**Solution**: Create a Supabase edge function (`generate-sitemap`) that:
- Queries `blog_posts` where `is_published = true`
- Merges with the existing static routes and 250 city pages
- Returns valid XML with proper `lastmod` dates from `published_at`
- Add a Vercel rewrite: `/sitemap.xml` → edge function URL
- Update `robots.txt` sitemap reference if needed

### 3. Internal Linking & Content Pages

**Problem**: Most pages are app screens with little crawlable text. There's no cross-linking between city pages, blog posts, and feature pages.

**Solution**:
- **City page footer links**: Add a "Nearby cities" or "Popular cities" section at the bottom of each `/weather/:citySlug` page linking to related city pages
- **Blog post interlinking**: Add "Related articles" at the bottom of each blog post
- **Add an FAQ page** at `/faq` with crawlable HTML (you already have FAQ schema in `index.html` — make it a real page too)
- **Add breadcrumbs** to city pages and blog posts (visible, not just schema) for both UX and SEO
- **Footer links**: Add links to key pages (About, Articles, FAQ, Download, DryRoutes) in the global footer

### 4. Core Web Vitals & Performance

**Problem**: Large JS bundle from lazy-loading many routes, potential LCP issues from the weather background animation.

**Solution**:
- **Preload critical fonts** — add `<link rel="preload">` for any custom fonts used
- **Optimize LCP**: Ensure the main weather content (or city page hero) renders before the animated background initializes
- **Add `fetchpriority="high"`** to hero images on city pages and blog cover images
- **Review bundle size**: Audit if any large dependencies (e.g., Framer Motion, chart libraries) can be further code-split
- **Add `<meta name="theme-color">` media queries** for light/dark mode

### 5. Quick Fixes (Low effort, high value)

- **Fix title typo**: `index.html` line 14 has `"Rainz Weather -Hyper-Local"` (missing space after dash)
- **Update `twitter:site`** from `@lovable_dev` to your own Twitter handle if you have one
- **Update `llm.txt`** line 9: still references `rainz.lovable.app` — should be `rainz.net` only
- **Add `hreflang` tag** if you plan multi-language support (you have a `LanguageProvider`)
- **Add `dateModified`** to blog post JSON-LD schema in `BlogPost.tsx`

---

## Technical Details

### File changes summary

| Area | Files |
|------|-------|
| Pre-rendering | `vercel.json`, new middleware or build script |
| Dynamic sitemap | New edge function `supabase/functions/generate-sitemap/index.ts`, `vercel.json` rewrite |
| Internal linking | `CityWeather.tsx`, `BlogPost.tsx`, footer component, new `FAQ.tsx` page |
| Performance | `index.html`, `vite.config.ts` (bundle analysis) |
| Quick fixes | `index.html`, `public/llm.txt`, `BlogPost.tsx` |

### Priority order
1. Quick fixes (immediate, 10 min)
2. Dynamic sitemap (30 min, ensures new content is discoverable)
3. Internal linking & FAQ page (45 min, builds topical authority)
4. Pre-rendering (1-2 hours, biggest crawlability impact)
5. Performance tuning (ongoing)

