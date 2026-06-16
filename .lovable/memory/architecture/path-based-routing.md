---
name: Path-based routing on rejn.app
description: Wildcard subdomains retired — every page lives at rejn.app/<path>, legacy subdomains 301 to apex, except any subdomain starting with "beta"
type: constraint
---
All routes live on the canonical apex `rejn.app` as standard paths (e.g. `rejn.app/predict`, `rejn.app/weather/oslo`, `rejn.app/auth`).

The previous wildcard subdomain setup (`*.rainz.net`, `*.rejn.app`) has been retired:
- Vercel `vercel.json` only redirects `rainz.net`, `www.rainz.net`, and `www.rejn.app` to `rejn.app`.
- `src/lib/subdomain-routing.ts` keeps `subdomainHref(path)` (returns `https://rejn.app<path>` or relative on preview) and `maybeRedirectLegacyDomain()` (flattens `*.rainz.net` / `*.rejn.app` → `rejn.app/<sub><path>`) for compatibility. `maybeRedirectPathToSubdomain()` is a no-op.
- **Exception**: any subdomain starting with `beta` on `rejn.app` or `rainz.net` (e.g. `beta524563.rejn.app`, `beta-test.rainz.net`) is explicitly excluded from the legacy redirect and is allowed to remain on its own subdomain.
- `src/integrations/supabase/client.ts` uses plain `localStorage` — no cross-subdomain cookie storage.
- `supabase/functions/generate-sitemap` emits apex-only URLs.

Do not reintroduce subdomain-based routing or cross-subdomain cookie storage.
