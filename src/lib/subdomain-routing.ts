// Subdomain routing for *.rainz.net
// Each curated app route can live on its own subdomain (e.g. predict.rainz.net).
// City routes get city.rainz.net. Unknown subdomains auto-map to /<sub>.

import { CITIES } from "@/data/cities";

const ROOT_DOMAIN = "rejn.app";
const LEGACY_DOMAIN = "rainz.net";

// subdomain -> internal path the SPA should render
export const SUBDOMAIN_TO_PATH: Record<string, string> = {
  predict: "/predict",
  social: "/social",
  explore: "/explore",
  dryroutes: "/dryroutes",
  widgets: "/widgets",
  info: "/info",
  download: "/download",
  airport: "/airport",
  faq: "/faq",
  about: "/about",
  auth: "/auth",
  admin: "/admin",
  mcp: "/mcp",
  docs: "/docs",
  // api & blog are handled separately (existing logic)
};

// Inverse map: path -> subdomain (only top-level, not nested like /airport/features)
export const PATH_TO_SUBDOMAIN: Record<string, string> = Object.fromEntries(
  Object.entries(SUBDOMAIN_TO_PATH).map(([sub, path]) => [path, sub])
);

// Subdomains we never want to auto-map to a path
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "mail",
  "notify",
  "mx",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "id-preview",
  "api", // handled separately
  "blog", // handled separately
]);

const CITY_SLUGS = new Set(CITIES.map((c) => c.slug));

export type HostResolution =
  | { kind: "preview" } // *.lovable.app, localhost, capacitor
  | { kind: "apex" } // rainz.net or www.rainz.net
  | { kind: "api" }
  | { kind: "blog" }
  | { kind: "curated"; subdomain: string; path: string }
  | { kind: "city"; slug: string }
  | { kind: "generic"; path: string }
  | { kind: "reserved" }; // reserved subdomain that isn't api/blog -> apex behavior

export function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export function isPreviewHost(host: string = getHostname()): boolean {
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".lovable.app")) return true;
  if (host.startsWith("id-preview--")) return true;
  // capacitor / native
  if (host === "" || host === "ionic" || host === "capacitor") return true;
  return !host.endsWith(ROOT_DOMAIN);
}

export function getSubdomain(host: string = getHostname()): string | null {
  if (isPreviewHost(host)) return null;
  if (host === ROOT_DOMAIN) return null;
  if (!host.endsWith("." + ROOT_DOMAIN)) return null;
  const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
  // ignore deep subdomains like a.b.rainz.net for now — treat as apex
  if (sub.includes(".")) return null;
  return sub.toLowerCase();
}

export function resolveHost(host: string = getHostname()): HostResolution {
  if (isPreviewHost(host)) return { kind: "preview" };
  const sub = getSubdomain(host);
  if (!sub || sub === "www") return { kind: "apex" };
  if (sub === "api") return { kind: "api" };
  if (sub === "blog") return { kind: "blog" };
  if (RESERVED_SUBDOMAINS.has(sub)) return { kind: "reserved" };
  if (sub in SUBDOMAIN_TO_PATH) {
    return { kind: "curated", subdomain: sub, path: SUBDOMAIN_TO_PATH[sub] };
  }
  if (CITY_SLUGS.has(sub)) {
    return { kind: "city", slug: sub };
  }
  // generic: treat /<sub> as the intended path
  return { kind: "generic", path: "/" + sub };
}

// Build a full https URL for a path on its appropriate subdomain.
// Falls back to a relative path on preview/native hosts.
export function subdomainHref(path: string): string {
  const host = getHostname();
  if (isPreviewHost(host)) return path;

  // Normalize
  const cleanPath = path.startsWith("/") ? path : "/" + path;

  // Top-level curated path → subdomain root
  if (cleanPath in PATH_TO_SUBDOMAIN) {
    return `https://${PATH_TO_SUBDOMAIN[cleanPath]}.${ROOT_DOMAIN}/`;
  }

  // /weather/<city> → <city>.rainz.net
  const cityMatch = cleanPath.match(/^\/weather\/([^/?#]+)/);
  if (cityMatch && CITY_SLUGS.has(cityMatch[1])) {
    return `https://${cityMatch[1]}.${ROOT_DOMAIN}/`;
  }

  // Nested under a curated subdomain (e.g. /airport/features) → keep on that subdomain
  for (const [topPath, sub] of Object.entries(PATH_TO_SUBDOMAIN)) {
    if (cleanPath.startsWith(topPath + "/")) {
      const rest = cleanPath.slice(topPath.length); // includes leading /
      return `https://${sub}.${ROOT_DOMAIN}${rest}`;
    }
  }

  // Default: apex
  return `https://${ROOT_DOMAIN}${cleanPath}`;
}

// On apex/www: if the current path maps to a subdomain, redirect there once.
export function maybeRedirectPathToSubdomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = getHostname();
  if (isPreviewHost(host)) return false;
  const sub = getSubdomain(host);
  if (sub && sub !== "www") return false; // only redirect from apex/www

  const { pathname, search, hash } = window.location;

  // Top-level curated
  if (pathname in PATH_TO_SUBDOMAIN) {
    const target = `https://${PATH_TO_SUBDOMAIN[pathname]}.${ROOT_DOMAIN}/${search}${hash}`;
    window.location.replace(target);
    return true;
  }

  // Nested under curated
  for (const [topPath, subName] of Object.entries(PATH_TO_SUBDOMAIN)) {
    if (pathname.startsWith(topPath + "/")) {
      const rest = pathname.slice(topPath.length);
      window.location.replace(
        `https://${subName}.${ROOT_DOMAIN}${rest}${search}${hash}`
      );
      return true;
    }
  }

  // City pages
  const cityMatch = pathname.match(/^\/weather\/([^/?#]+)\/?$/);
  if (cityMatch && CITY_SLUGS.has(cityMatch[1])) {
    window.location.replace(
      `https://${cityMatch[1]}.${ROOT_DOMAIN}/${search}${hash}`
    );
    return true;
  }

  return false;
}

export { ROOT_DOMAIN };
