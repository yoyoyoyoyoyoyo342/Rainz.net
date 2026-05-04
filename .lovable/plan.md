## Wildcard subdomain routing for *.rainz.net

Goal: every page lives on its own subdomain. Visiting `predict.rainz.net` shows the Predict page, `copenhagen.rainz.net` shows Copenhagen weather, and any unknown subdomain auto-maps to the matching path. Old `rainz.net/predict` URLs 301 to `predict.rainz.net`.

### 1. Curated app-route subdomains

Mapped at the client (App.tsx) by inspecting `window.location.hostname`. The router serves the right page while the URL bar stays on the subdomain root (`/`).

| Subdomain | Page |
|---|---|
| predict.rainz.net | Predict |
| social.rainz.net | Social |
| explore.rainz.net | Explore |
| dryroutes.rainz.net | DryRoutes |
| widgets.rainz.net | Widgets |
| info.rainz.net | Info |
| download.rainz.net | Download |
| airport.rainz.net | Airport landing (sub-routes still work as paths) |
| faq.rainz.net | FAQ |
| about.rainz.net | About |
| auth.rainz.net | Auth |
| admin.rainz.net | AdminPanel |
| mcp.rainz.net | MCP |
| api.rainz.net | already handled (redirects to rainz.net) |
| blog.rainz.net | already handled (Articles) |

### 2. City subdomains

`<city>.rainz.net` → renders `CityWeather` with that slug, when the slug exists in `src/data/cities.ts` (or matches a `city_pages` row). Examples: `copenhagen.rainz.net`, `oslo.rainz.net`, `london.rainz.net`.

### 3. Generic fallback (auto-map)

For any other subdomain `<x>.rainz.net` that isn't `www`, `blog`, `api`, or one of the curated app/city ones, render the same component the path `/x` would render. Implemented by injecting the subdomain as the path into React Router on mount. Unknown → NotFound.

Reserved (never auto-mapped): `www`, `mail`, `notify`, `mx`, `smtp`, `ftp`, `cdn`, `static`, `assets`, `id-preview*`, `*.lovable.app`.

### 4. 301 redirects: paths → subdomains

A small client-side redirect runs on `rainz.net` and `www.rainz.net` only. If the pathname matches a known subdomain mapping (e.g. `/predict`, `/weather/copenhagen`, `/dryroutes`), it does `window.location.replace("https://predict.rainz.net" + searchAndHash)`.

We use a client redirect (not a Vercel rewrite) because Lovable hosting / Vercel for this project doesn't process custom rewrites for SPA fallback — and a 301 from the static layer would require platform config we don't have. Search engines will still pick up the redirect, and a `<link rel="canonical">` pointing at the subdomain is added for safety.

### 5. SEO

- `seo-head.tsx`: derive canonical from current hostname, so `predict.rainz.net/` is canonical (not `rainz.net/predict`).
- `generate-sitemap` edge function + `public/sitemap.xml`: rewrite curated routes and city routes to subdomain URLs. Root `rainz.net/` stays as the homepage entry.
- `public/robots.txt`: add `Sitemap:` line, allow all subdomains.
- `index.html` meta `og:url` becomes dynamic via the seo-head component (already does this for path; switch to host+path).

### 6. Auth & cookies

Supabase auth is per-origin by default, which would log users out when navigating between subdomains. Two options — recommend (a):

a) Set Supabase auth storage to a cookie on `.rainz.net` (leading dot) so the session is shared across all subdomains. Implemented by passing a custom `storage` adapter to `createClient` that reads/writes `document.cookie` with `domain=.rainz.net; secure; samesite=lax`.

b) Keep per-subdomain sessions (users sign in again on each). Worse UX, not recommended.

Same change for any other localStorage that should follow the user (theme, language, saved-locations cache): keep these in localStorage per-subdomain — they're cheap to recreate. Only the auth session needs cross-subdomain sharing.

### 7. Internal links

App-wide `<Link to="/predict">` etc. should keep working on a subdomain (they navigate within the SPA), but to actually move the user to the subdomain we update the navigation helpers:

- A new helper `subdomainHref(path)` returns `https://predict.rainz.net/...` if the path maps to a subdomain, else the relative path.
- Used in: navbar, footer, mobile bottom-nav, hero CTAs, share-link generators (battles, social cards), email templates (`morning-review.tsx`).

### 8. Vercel / DNS

User has already added `*.rainz.net` to Vercel — no DNS work needed from us. We add a note in the README confirming the wildcard SSL covers all generated subdomains.

### Technical details

**Files to add**
- `src/lib/subdomain-routing.ts` — single source of truth: `SUBDOMAIN_TO_PATH`, `PATH_TO_SUBDOMAIN`, `RESERVED_SUBDOMAINS`, `getSubdomain()`, `subdomainHref(path)`, `resolveRouteFromHost()`.

**Files to edit**
- `src/App.tsx` — replace the two hardcoded subdomain checks with `resolveRouteFromHost()`. On `rainz.net`/`www`, run `pathRedirectToSubdomain()` once on mount. On a curated subdomain, render its page directly at `/`. On a city subdomain, render `<CityWeather citySlug={...} />`. On a generic subdomain, push `/<sub>` into the router and render the normal route tree.
- `src/integrations/supabase/client.ts` — add cookie storage adapter scoped to `.rainz.net` (only when hostname ends with `rainz.net`); fall back to localStorage on preview/lovable.app.
- `src/components/seo/seo-head.tsx` — canonical = `${origin}${pathname}`.
- `supabase/functions/generate-sitemap/index.ts` — emit subdomain URLs for curated + city routes.
- `public/sitemap.xml` — same rewrites for the static fallback.
- `public/robots.txt` — add Sitemap line, allow `*`.
- Navigation components (navbar, mobile-nav, footer, hero CTAs, share helpers, `morning-review.tsx` email) — switch absolute links through `subdomainHref()`.

**Edge cases handled**
- Preview hosts (`*.lovable.app`, `id-preview-*`) — skip subdomain logic entirely, behave like today.
- `www.rainz.net` — treated identical to apex, redirects paths to subdomains.
- Subdomain + non-root path (e.g. `predict.rainz.net/social`) — treated as cross-section navigation; redirected to `social.rainz.net/`.
- Capacitor native app (no real hostname) — skip subdomain logic; everything stays path-based.
- Service worker (`public/sw.js`) — scope is per-origin, so each subdomain registers its own. No change needed but cache versioning bumped to avoid stale chunks.

### Out of scope
- Server-side 301s (would require Vercel config we don't manage from Lovable). Client redirect is the workable substitute.
- Per-subdomain custom themes / branding.
- Renaming existing routes.
