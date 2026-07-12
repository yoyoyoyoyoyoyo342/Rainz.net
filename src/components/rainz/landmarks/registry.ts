// Landmark city registry. Adding a city = one entry here + its SVG in ./svgs.tsx.
// Coordinates are the landmark itself; radius is generous (km) so nearby suburbs match.

export type LandmarkId =
  | "golden-gate"
  | "little-mermaid"
  | "statue-of-liberty"
  | "big-ben"
  | "eiffel-tower"
  | "tokyo-tower"
  | "opera-house"
  | "hollywood-sign"
  | "stockholm-city-hall"
  | "brandenburg-gate"
  | "colosseum"
  | "sagrada-familia"
  | "amsterdam-canal"
  | "burj-khalifa"
  | "cn-tower"
  | "willis-tower"
  | "space-needle"
  | "st-basil"
  | "christ-redeemer";

export interface LandmarkEntry {
  id: LandmarkId;
  city: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
  aliases?: string[]; // name substrings that also match (case-insensitive)
  /** Small, single-point landmark — render larger and anchored to the right side. */
  compact?: boolean;
}

export const LANDMARKS: LandmarkEntry[] = [
  { id: "golden-gate",     city: "San Francisco", country: "US", lat: 37.7749, lon: -122.4194, radiusKm: 90,
    aliases: ["san francisco", "bay area", "oakland", "berkeley", "san jose", "palo alto", "sausalito", "daly city"] },
  { id: "little-mermaid",  city: "Copenhagen",    country: "DK", lat: 55.6761, lon:   12.5683, radiusKm: 40, compact: true,
    aliases: ["copenhagen", "københavn", "kobenhavn", "frederiksberg"] },
  { id: "statue-of-liberty", city: "New York",    country: "US", lat: 40.7128, lon:  -74.0060, radiusKm: 60, compact: true,
    aliases: ["new york", "nyc", "brooklyn", "manhattan", "queens", "bronx", "jersey city"] },
  { id: "big-ben",         city: "London",        country: "GB", lat: 51.5074, lon:   -0.1278, radiusKm: 50, compact: true,
    aliases: ["london", "westminster", "camden", "islington", "greenwich"] },
  { id: "eiffel-tower",    city: "Paris",         country: "FR", lat: 48.8566, lon:    2.3522, radiusKm: 40, compact: true,
    aliases: ["paris"] },
  { id: "tokyo-tower",     city: "Tokyo",         country: "JP", lat: 35.6762, lon:  139.6503, radiusKm: 60, compact: true,
    aliases: ["tokyo", "shibuya", "shinjuku", "minato"] },
  { id: "opera-house",     city: "Sydney",        country: "AU", lat: -33.8568, lon: 151.2153, radiusKm: 60,
    aliases: ["sydney"] },
  { id: "hollywood-sign",  city: "Los Angeles",   country: "US", lat: 34.0522, lon: -118.2437, radiusKm: 80,
    aliases: ["los angeles", "hollywood", "santa monica", "burbank", "long beach", "pasadena"] },
  { id: "stockholm-city-hall", city: "Stockholm", country: "SE", lat: 59.3293, lon:  18.0686, radiusKm: 40, compact: true,
    aliases: ["stockholm", "solna"] },
  { id: "brandenburg-gate", city: "Berlin",       country: "DE", lat: 52.5163, lon:  13.3777, radiusKm: 45,
    aliases: ["berlin"] },
  { id: "colosseum",       city: "Rome",          country: "IT", lat: 41.8902, lon:  12.4922, radiusKm: 40,
    aliases: ["rome", "roma"] },
  { id: "sagrada-familia", city: "Barcelona",     country: "ES", lat: 41.4036, lon:   2.1744, radiusKm: 40, compact: true,
    aliases: ["barcelona"] },
  { id: "amsterdam-canal", city: "Amsterdam",     country: "NL", lat: 52.3676, lon:   4.9041, radiusKm: 40,
    aliases: ["amsterdam"] },
  { id: "burj-khalifa",    city: "Dubai",         country: "AE", lat: 25.1972, lon:  55.2744, radiusKm: 60, compact: true,
    aliases: ["dubai"] },
  { id: "cn-tower",        city: "Toronto",       country: "CA", lat: 43.6532, lon: -79.3832, radiusKm: 55, compact: true,
    aliases: ["toronto"] },
  { id: "willis-tower",    city: "Chicago",       country: "US", lat: 41.8781, lon: -87.6298, radiusKm: 60,
    aliases: ["chicago"] },
  { id: "space-needle",    city: "Seattle",       country: "US", lat: 47.6205, lon: -122.3493, radiusKm: 55, compact: true,
    aliases: ["seattle"] },
  { id: "st-basil",        city: "Moscow",        country: "RU", lat: 55.7525, lon:  37.6231, radiusKm: 60,
    aliases: ["moscow", "moskva"] },
  { id: "christ-redeemer", city: "Rio de Janeiro", country: "BR", lat: -22.9519, lon: -43.2105, radiusKm: 55, compact: true,
    aliases: ["rio", "rio de janeiro"] },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function findLandmark(
  lat?: number,
  lon?: number,
  locationName?: string,
): LandmarkEntry | null {
  // Name match first — beats coordinates when a user searched a suburb.
  if (locationName) {
    const n = locationName.toLowerCase();
    for (const l of LANDMARKS) {
      if (l.aliases?.some((a) => n.includes(a))) return l;
    }
  }
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  let best: { entry: LandmarkEntry; d: number } | null = null;
  for (const l of LANDMARKS) {
    const d = haversineKm(lat, lon, l.lat, l.lon);
    if (d <= l.radiusKm && (!best || d < best.d)) best = { entry: l, d };
  }
  return best?.entry ?? null;
}
