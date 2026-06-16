// Path-based routing on rejn.app.
// The wildcard subdomain setup (*.rainz.net, *.rejn.app) has been retired.
// Every page now lives at rejn.app/<path>.
//
// This module keeps a small compatibility surface so old callers
// (subdomainHref, maybeRedirectLegacyDomain) keep working without changes.

const ROOT_DOMAIN = "rejn.app";
const LEGACY_DOMAIN = "rainz.net";

export function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export function isPreviewHost(host: string = getHostname()): boolean {
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".lovable.app")) return true;
  if (host.startsWith("id-preview--")) return true;
  if (host === "" || host === "ionic" || host === "capacitor") return true;
  return !host.endsWith(ROOT_DOMAIN) && !host.endsWith(LEGACY_DOMAIN);
}

export function isLegacyRainzHost(host: string = getHostname()): boolean {
  return host === LEGACY_DOMAIN || host.endsWith("." + LEGACY_DOMAIN);
}

// Build an absolute URL for a path on the canonical apex.
// On preview/native we return a relative path so React Router handles it.
export function subdomainHref(path: string): string {
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  if (isPreviewHost()) return cleanPath;
  return `https://${ROOT_DOMAIN}${cleanPath}`;
}

// No-op kept for backwards compatibility (subdomains are no longer used).
export function maybeRedirectPathToSubdomain(): boolean {
  return false;
}

// Returns a minimal host descriptor. Subdomains are no longer treated specially
// (apex behaviour is used everywhere) except api/blog which were never
// wildcard-routed in the SPA itself.
export type HostResolution =
  | { kind: "preview" }
  | { kind: "apex" };

export function resolveHost(): HostResolution {
  return { kind: isPreviewHost() ? "preview" : "apex" };
}

// Redirect any *.rainz.net or apex rainz.net (and any leftover *.rejn.app
// subdomain) to the equivalent path on the canonical apex rejn.app.
// Old subdomain hosts like predict.rainz.net or predict.rejn.app are
// flattened to https://rejn.app/predict<rest><search><hash>.
export function maybeRedirectLegacyDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = getHostname();
  const { pathname, search, hash } = window.location;

  const isApex = host === ROOT_DOMAIN || host === "www." + ROOT_DOMAIN;
  if (isApex) return false;

  // Build canonical apex URL preserving path/search/hash
  const apexUrl = (path: string) =>
    `https://${ROOT_DOMAIN}${path.startsWith("/") ? path : "/" + path}${search}${hash}`;

  // rainz.net (apex) → rejn.app same path
  if (host === LEGACY_DOMAIN || host === "www." + LEGACY_DOMAIN) {
    window.location.replace(apexUrl(pathname));
    return true;
  }

  // *.rainz.net subdomain → rejn.app/<sub><pathname>
  if (host.endsWith("." + LEGACY_DOMAIN)) {
    const sub = host.slice(0, host.length - LEGACY_DOMAIN.length - 1);
    if (sub && !sub.includes(".") && sub !== "www") {
      const newPath = pathname === "/" ? "/" + sub : "/" + sub + pathname;
      window.location.replace(apexUrl(newPath));
      return true;
    }
    window.location.replace(apexUrl(pathname));
    return true;
  }

  // *.rejn.app subdomain (legacy wildcard) → rejn.app/<sub><pathname>
  if (host.endsWith("." + ROOT_DOMAIN) && host !== "www." + ROOT_DOMAIN) {
    const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
    if (sub && !sub.includes(".")) {
      const newPath = pathname === "/" ? "/" + sub : "/" + sub + pathname;
      window.location.replace(apexUrl(newPath));
      return true;
    }
  }

  return false;
}

export { ROOT_DOMAIN, LEGACY_DOMAIN };
