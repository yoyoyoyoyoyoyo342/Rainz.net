/**
 * Rejn Birthday Mode
 * Active Aug 8 → Sep 8 every year. Turns the app gold and unlocks
 * birthday-specific surprises. The 8th of August is "Rejn's Birthday".
 */

export const BIRTHDAY_LOGO = "/birthday-logo.png";

export function getBirthdayWindow(now: Date = new Date()) {
  const year = now.getFullYear();
  const start = new Date(year, 7, 8, 0, 0, 0); // Aug 8 (month is 0-indexed)
  const end = new Date(year, 8, 8, 23, 59, 59); // Sep 8
  return { start, end, year };
}

export function isBirthdayMode(now: Date = new Date()): boolean {
  const { start, end } = getBirthdayWindow(now);
  return now >= start && now <= end;
}

export function isBirthdayDay(now: Date = new Date()): boolean {
  return now.getMonth() === 7 && now.getDate() === 8;
}

export function daysUntilBirthdayEnds(now: Date = new Date()): number {
  const { end } = getBirthdayWindow(now);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function rejnAgeOn(now: Date = new Date()): number {
  // Rejn launched Aug 8 2025 → turning (year - 2025) on Aug 8 of `now.year`.
  // During the window, the celebrated age is `year - 2025`.
  return Math.max(1, now.getFullYear() - 2025);
}

/**
 * Swap favicon links in <head> to the golden logo during the birthday window.
 * Stores original hrefs so we can restore them outside the window.
 */
const ORIGINAL_FAVICON_ATTR = "data-original-href";

export function applyBirthdayFavicon() {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]',
  );
  links.forEach((link) => {
    if (!link.hasAttribute(ORIGINAL_FAVICON_ATTR)) {
      link.setAttribute(ORIGINAL_FAVICON_ATTR, link.href);
    }
    link.href = BIRTHDAY_LOGO;
  });

  // Theme color → gold
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (!m.hasAttribute("data-original-content")) {
      m.setAttribute("data-original-content", m.content);
    }
    m.content = "#d4a017";
  });
}

export function restoreFavicon() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLLinkElement>(`link[${ORIGINAL_FAVICON_ATTR}]`)
    .forEach((link) => {
      const orig = link.getAttribute(ORIGINAL_FAVICON_ATTR);
      if (orig) link.href = orig;
    });
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-original-content]')
    .forEach((m) => {
      const orig = m.getAttribute("data-original-content");
      if (orig) m.content = orig;
    });
}

/**
 * Rejn 2.0 launch celebration window: only show the "2.0" label between
 * 21 June 2026 and 28 June 2026. Outside this week we just say "Rejn".
 */
export function isRejn2Window(now: Date = new Date()): boolean {
  const start = new Date(2026, 5, 21, 0, 0, 0); // 21 June 2026
  const end = new Date(2026, 5, 28, 23, 59, 59); // 28 June 2026
  return now >= start && now <= end;
}

export function brandName(now: Date = new Date()): string {
  return isRejn2Window(now) ? "Rejn 2.0" : "Rejn";
}
