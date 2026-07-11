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
  | "stockholm-city-hall";

export interface LandmarkEntry {
  id: LandmarkId;
  city: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
  aliases?: string[]; // name substrings that also match (case-insensitive)
}

export const LANDMARKS: LandmarkEntry[] = [
  { id: "golden-gate",     city: "San Francisco", country: "US", lat: 37.7749, lon: -122.4194, radiusKm: 90,
    aliases: ["san francisco", "bay area", "oakland", "berkeley", "san jose", "palo alto", "sausalito", "daly city"] },
  { id: "little-mermaid",  city: "Copenhagen",    country: "DK", lat: 55.6761, lon:   12.5683, radiusKm: 40,
    aliases: ["copenhagen", "københavn", "kobenhavn", "frederiksberg"] },
  { id: "statue-of-liberty", city: "New York",    country: "US", lat: 40.7128, lon:  -74.0060, radiusKm: 60,
    aliases: ["new york", "nyc", "brooklyn", "manhattan", "queens", "bronx", "jersey city"] },
  { id: "big-ben",         city: "London",        country: "GB", lat: 51.5074, lon:   -0.1278, radiusKm: 50,
    aliases: ["london", "westminster", "camden", "islington", "greenwich"] },
  { id: "eiffel-tower",    city: "Paris",         country: "FR", lat: 48.8566, lon:    2.3522, radiusKm: 40,
    aliases: ["paris"] },
  { id: "tokyo-tower",     city: "Tokyo",         country: "JP", lat: 35.6762, lon:  139.6503, radiusKm: 60,
    aliases: ["tokyo", "shibuya", "shinjuku", "minato"] },
  { id: "opera-house",     city: "Sydney",        country: "AU", lat: -33.8568, lon: 151.2153, radiusKm: 60,
    aliases: ["sydney"] },
  { id: "hollywood-sign",  city: "Los Angeles",   country: "US", lat: 34.0522, lon: -118.2437, radiusKm: 80,
    aliases: ["los angeles", "hollywood", "santa monica", "burbank", "long beach", "pasadena"] },
  { id: "stockholm-city-hall", city: "Stockholm", country: "SE", lat: 59.3293, lon:  18.0686, radiusKm: 40,
    aliases: ["stockholm", "solna"] },
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
