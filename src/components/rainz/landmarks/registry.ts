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
  | "christ-redeemer"
  | "taj-mahal"
  | "pyramids"
  | "petronas"
  | "oriental-pearl"
  | "taipei-101"
  | "acropolis"
  | "generic-skyline"
  | "generic-cathedral"
  | "generic-pagoda"
  | "generic-minaret"
  | "generic-alpine"
  | "generic-tropical";

export interface LandmarkEntry {
  id: LandmarkId;
  city: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
  aliases?: string[];
  compact?: boolean;
}

export const LANDMARKS: LandmarkEntry[] = [
  // ── Signature landmarks ────────────────────────────────────────────────
  { id: "golden-gate", city: "San Francisco", country: "US", lat: 37.7749, lon: -122.4194, radiusKm: 90,
    aliases: ["san francisco", "bay area", "oakland", "berkeley", "san jose", "palo alto", "sausalito", "daly city"] },
  { id: "little-mermaid", city: "Copenhagen", country: "DK", lat: 55.6761, lon: 12.5683, radiusKm: 40, compact: true,
    aliases: ["copenhagen", "københavn", "kobenhavn", "frederiksberg"] },
  { id: "statue-of-liberty", city: "New York", country: "US", lat: 40.7128, lon: -74.0060, radiusKm: 60, compact: true,
    aliases: ["new york", "nyc", "brooklyn", "manhattan", "queens", "bronx", "jersey city"] },
  { id: "big-ben", city: "London", country: "GB", lat: 51.5074, lon: -0.1278, radiusKm: 50, compact: true,
    aliases: ["london", "westminster", "camden", "islington", "greenwich"] },
  { id: "eiffel-tower", city: "Paris", country: "FR", lat: 48.8566, lon: 2.3522, radiusKm: 40, compact: true,
    aliases: ["paris"] },
  { id: "tokyo-tower", city: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503, radiusKm: 60, compact: true,
    aliases: ["tokyo", "shibuya", "shinjuku", "minato"] },
  { id: "opera-house", city: "Sydney", country: "AU", lat: -33.8568, lon: 151.2153, radiusKm: 60,
    aliases: ["sydney"] },
  { id: "hollywood-sign", city: "Los Angeles", country: "US", lat: 34.0522, lon: -118.2437, radiusKm: 80,
    aliases: ["los angeles", "hollywood", "santa monica", "burbank", "long beach", "pasadena"] },
  { id: "stockholm-city-hall", city: "Stockholm", country: "SE", lat: 59.3293, lon: 18.0686, radiusKm: 40, compact: true,
    aliases: ["stockholm", "solna"] },
  { id: "brandenburg-gate", city: "Berlin", country: "DE", lat: 52.5163, lon: 13.3777, radiusKm: 45,
    aliases: ["berlin"] },
  { id: "colosseum", city: "Rome", country: "IT", lat: 41.8902, lon: 12.4922, radiusKm: 40,
    aliases: ["rome", "roma"] },
  { id: "sagrada-familia", city: "Barcelona", country: "ES", lat: 41.4036, lon: 2.1744, radiusKm: 40, compact: true,
    aliases: ["barcelona"] },
  { id: "amsterdam-canal", city: "Amsterdam", country: "NL", lat: 52.3676, lon: 4.9041, radiusKm: 40,
    aliases: ["amsterdam"] },
  { id: "burj-khalifa", city: "Dubai", country: "AE", lat: 25.1972, lon: 55.2744, radiusKm: 60, compact: true,
    aliases: ["dubai"] },
  { id: "cn-tower", city: "Toronto", country: "CA", lat: 43.6532, lon: -79.3832, radiusKm: 55, compact: true,
    aliases: ["toronto"] },
  { id: "willis-tower", city: "Chicago", country: "US", lat: 41.8781, lon: -87.6298, radiusKm: 60,
    aliases: ["chicago"] },
  { id: "space-needle", city: "Seattle", country: "US", lat: 47.6205, lon: -122.3493, radiusKm: 55, compact: true,
    aliases: ["seattle"] },
  { id: "st-basil", city: "Moscow", country: "RU", lat: 55.7525, lon: 37.6231, radiusKm: 60,
    aliases: ["moscow", "moskva"] },
  { id: "christ-redeemer", city: "Rio de Janeiro", country: "BR", lat: -22.9519, lon: -43.2105, radiusKm: 55, compact: true,
    aliases: ["rio", "rio de janeiro"] },
  { id: "taj-mahal", city: "Delhi / Agra", country: "IN", lat: 28.6139, lon: 77.2090, radiusKm: 200,
    aliases: ["delhi", "new delhi", "agra", "noida", "gurgaon", "gurugram"] },
  { id: "pyramids", city: "Cairo", country: "EG", lat: 30.0444, lon: 31.2357, radiusKm: 60,
    aliases: ["cairo", "giza"] },
  { id: "petronas", city: "Kuala Lumpur", country: "MY", lat: 3.1390, lon: 101.6869, radiusKm: 50, compact: true,
    aliases: ["kuala lumpur", "putrajaya"] },
  { id: "oriental-pearl", city: "Shanghai", country: "CN", lat: 31.2304, lon: 121.4737, radiusKm: 60,
    aliases: ["shanghai"] },
  { id: "taipei-101", city: "Taipei", country: "TW", lat: 25.0330, lon: 121.5654, radiusKm: 50, compact: true,
    aliases: ["taipei"] },
  { id: "acropolis", city: "Athens", country: "GR", lat: 37.9838, lon: 23.7275, radiusKm: 50,
    aliases: ["athens", "athina"] },

  // ── Skyline template ───────────────────────────────────────────────────
  { id: "generic-skyline", city: "Hong Kong", country: "HK", lat: 22.3193, lon: 114.1694, radiusKm: 60, aliases: ["hong kong", "kowloon"] },
  { id: "generic-skyline", city: "Singapore", country: "SG", lat: 1.3521, lon: 103.8198, radiusKm: 60, aliases: ["singapore"] },
  { id: "generic-skyline", city: "Miami", country: "US", lat: 25.7617, lon: -80.1918, radiusKm: 60, aliases: ["miami"] },
  { id: "generic-skyline", city: "Houston", country: "US", lat: 29.7604, lon: -95.3698, radiusKm: 60, aliases: ["houston"] },
  { id: "generic-skyline", city: "Dallas", country: "US", lat: 32.7767, lon: -96.7970, radiusKm: 60, aliases: ["dallas", "fort worth"] },
  { id: "generic-skyline", city: "Atlanta", country: "US", lat: 33.7490, lon: -84.3880, radiusKm: 60, aliases: ["atlanta"] },
  { id: "generic-skyline", city: "Boston", country: "US", lat: 42.3601, lon: -71.0589, radiusKm: 60, aliases: ["boston", "cambridge"] },
  { id: "generic-skyline", city: "Philadelphia", country: "US", lat: 39.9526, lon: -75.1652, radiusKm: 60, aliases: ["philadelphia", "philly"] },
  { id: "generic-skyline", city: "Washington", country: "US", lat: 38.9072, lon: -77.0369, radiusKm: 55, aliases: ["washington dc", "district of columbia"] },
  { id: "generic-skyline", city: "Denver", country: "US", lat: 39.7392, lon: -104.9903, radiusKm: 60, aliases: ["denver"] },
  { id: "generic-skyline", city: "Minneapolis", country: "US", lat: 44.9778, lon: -93.2650, radiusKm: 60, aliases: ["minneapolis", "st paul"] },
  { id: "generic-skyline", city: "Vancouver", country: "CA", lat: 49.2827, lon: -123.1207, radiusKm: 60, aliases: ["vancouver"] },
  { id: "generic-skyline", city: "Montreal", country: "CA", lat: 45.5017, lon: -73.5673, radiusKm: 60, aliases: ["montreal", "montréal"] },
  { id: "generic-skyline", city: "Mexico City", country: "MX", lat: 19.4326, lon: -99.1332, radiusKm: 60, aliases: ["mexico city", "ciudad de mexico", "cdmx"] },
  { id: "generic-skyline", city: "São Paulo", country: "BR", lat: -23.5505, lon: -46.6333, radiusKm: 60, aliases: ["sao paulo", "são paulo"] },
  { id: "generic-skyline", city: "Buenos Aires", country: "AR", lat: -34.6037, lon: -58.3816, radiusKm: 60, aliases: ["buenos aires"] },
  { id: "generic-skyline", city: "Santiago", country: "CL", lat: -33.4489, lon: -70.6693, radiusKm: 60, aliases: ["santiago"] },
  { id: "generic-skyline", city: "Bogotá", country: "CO", lat: 4.7110, lon: -74.0721, radiusKm: 60, aliases: ["bogota", "bogotá"] },
  { id: "generic-skyline", city: "Melbourne", country: "AU", lat: -37.8136, lon: 144.9631, radiusKm: 60, aliases: ["melbourne"] },
  { id: "generic-skyline", city: "Brisbane", country: "AU", lat: -27.4698, lon: 153.0251, radiusKm: 60, aliases: ["brisbane"] },
  { id: "generic-skyline", city: "Auckland", country: "NZ", lat: -36.8485, lon: 174.7633, radiusKm: 60, aliases: ["auckland"] },
  { id: "generic-skyline", city: "Seoul", country: "KR", lat: 37.5665, lon: 126.9780, radiusKm: 60, aliases: ["seoul"] },
  { id: "generic-skyline", city: "Osaka", country: "JP", lat: 34.6937, lon: 135.5023, radiusKm: 60, aliases: ["osaka"] },
  { id: "generic-skyline", city: "Beijing", country: "CN", lat: 39.9042, lon: 116.4074, radiusKm: 60, aliases: ["beijing"] },
  { id: "generic-skyline", city: "Shenzhen", country: "CN", lat: 22.5431, lon: 114.0579, radiusKm: 55, aliases: ["shenzhen"] },
  { id: "generic-skyline", city: "Guangzhou", country: "CN", lat: 23.1291, lon: 113.2644, radiusKm: 55, aliases: ["guangzhou"] },
  { id: "generic-skyline", city: "Bangkok", country: "TH", lat: 13.7563, lon: 100.5018, radiusKm: 60, aliases: ["bangkok"] },
  { id: "generic-skyline", city: "Jakarta", country: "ID", lat: -6.2088, lon: 106.8456, radiusKm: 60, aliases: ["jakarta"] },
  { id: "generic-skyline", city: "Manila", country: "PH", lat: 14.5995, lon: 120.9842, radiusKm: 55, aliases: ["manila"] },
  { id: "generic-skyline", city: "Mumbai", country: "IN", lat: 19.0760, lon: 72.8777, radiusKm: 55, aliases: ["mumbai", "bombay"] },
  { id: "generic-skyline", city: "Bangalore", country: "IN", lat: 12.9716, lon: 77.5946, radiusKm: 55, aliases: ["bangalore", "bengaluru"] },
  { id: "generic-skyline", city: "Frankfurt", country: "DE", lat: 50.1109, lon: 8.6821, radiusKm: 50, aliases: ["frankfurt"] },
  { id: "generic-skyline", city: "Warsaw", country: "PL", lat: 52.2297, lon: 21.0122, radiusKm: 55, aliases: ["warsaw", "warszawa"] },
  { id: "generic-skyline", city: "Tel Aviv", country: "IL", lat: 32.0853, lon: 34.7818, radiusKm: 50, aliases: ["tel aviv"] },
  { id: "generic-skyline", city: "Johannesburg", country: "ZA", lat: -26.2041, lon: 28.0473, radiusKm: 60, aliases: ["johannesburg", "joburg"] },
  { id: "generic-skyline", city: "Nairobi", country: "KE", lat: -1.2921, lon: 36.8219, radiusKm: 55, aliases: ["nairobi"] },
  { id: "generic-skyline", city: "Doha", country: "QA", lat: 25.2854, lon: 51.5310, radiusKm: 45, aliases: ["doha"] },
  { id: "generic-skyline", city: "Abu Dhabi", country: "AE", lat: 24.4539, lon: 54.3773, radiusKm: 55, aliases: ["abu dhabi"] },
  { id: "generic-skyline", city: "Riyadh", country: "SA", lat: 24.7136, lon: 46.6753, radiusKm: 55, aliases: ["riyadh"] },
  { id: "generic-skyline", city: "Austin", country: "US", lat: 30.2672, lon: -97.7431, radiusKm: 55, aliases: ["austin"] },
  { id: "generic-skyline", city: "Phoenix", country: "US", lat: 33.4484, lon: -112.0740, radiusKm: 60, aliases: ["phoenix", "scottsdale"] },
  { id: "generic-skyline", city: "San Diego", country: "US", lat: 32.7157, lon: -117.1611, radiusKm: 55, aliases: ["san diego"] },
  { id: "generic-skyline", city: "Portland", country: "US", lat: 45.5152, lon: -122.6784, radiusKm: 55, aliases: ["portland"] },

  // ── Cathedral template ─────────────────────────────────────────────────
  { id: "generic-cathedral", city: "Madrid", country: "ES", lat: 40.4168, lon: -3.7038, radiusKm: 55, aliases: ["madrid"] },
  { id: "generic-cathedral", city: "Milan", country: "IT", lat: 45.4642, lon: 9.1900, radiusKm: 50, aliases: ["milan", "milano"] },
  { id: "generic-cathedral", city: "Florence", country: "IT", lat: 43.7696, lon: 11.2558, radiusKm: 40, aliases: ["florence", "firenze"] },
  { id: "generic-cathedral", city: "Venice", country: "IT", lat: 45.4408, lon: 12.3155, radiusKm: 30, aliases: ["venice", "venezia"] },
  { id: "generic-cathedral", city: "Vienna", country: "AT", lat: 48.2082, lon: 16.3738, radiusKm: 50, aliases: ["vienna", "wien"] },
  { id: "generic-cathedral", city: "Prague", country: "CZ", lat: 50.0755, lon: 14.4378, radiusKm: 50, aliases: ["prague", "praha"] },
  { id: "generic-cathedral", city: "Budapest", country: "HU", lat: 47.4979, lon: 19.0402, radiusKm: 50, aliases: ["budapest"] },
  { id: "generic-cathedral", city: "Munich", country: "DE", lat: 48.1351, lon: 11.5820, radiusKm: 55, aliases: ["munich", "münchen", "munchen"] },
  { id: "generic-cathedral", city: "Cologne", country: "DE", lat: 50.9375, lon: 6.9603, radiusKm: 45, aliases: ["cologne", "köln", "koln"] },
  { id: "generic-cathedral", city: "Hamburg", country: "DE", lat: 53.5511, lon: 9.9937, radiusKm: 50, aliases: ["hamburg"] },
  { id: "generic-cathedral", city: "Brussels", country: "BE", lat: 50.8503, lon: 4.3517, radiusKm: 45, aliases: ["brussels", "bruxelles", "brussel"] },
  { id: "generic-cathedral", city: "Lisbon", country: "PT", lat: 38.7223, lon: -9.1393, radiusKm: 50, aliases: ["lisbon", "lisboa"] },
  { id: "generic-cathedral", city: "Porto", country: "PT", lat: 41.1579, lon: -8.6291, radiusKm: 40, aliases: ["porto"] },
  { id: "generic-cathedral", city: "Seville", country: "ES", lat: 37.3891, lon: -5.9845, radiusKm: 45, aliases: ["seville", "sevilla"] },
  { id: "generic-cathedral", city: "Valencia", country: "ES", lat: 39.4699, lon: -0.3763, radiusKm: 45, aliases: ["valencia"] },
  { id: "generic-cathedral", city: "Dublin", country: "IE", lat: 53.3498, lon: -6.2603, radiusKm: 45, aliases: ["dublin"] },
  { id: "generic-cathedral", city: "Edinburgh", country: "GB", lat: 55.9533, lon: -3.1883, radiusKm: 40, aliases: ["edinburgh"] },
  { id: "generic-cathedral", city: "Manchester", country: "GB", lat: 53.4808, lon: -2.2426, radiusKm: 45, aliases: ["manchester"] },
  { id: "generic-cathedral", city: "Kyiv", country: "UA", lat: 50.4501, lon: 30.5234, radiusKm: 55, aliases: ["kyiv", "kiev"] },
  { id: "generic-cathedral", city: "Saint Petersburg", country: "RU", lat: 59.9311, lon: 30.3609, radiusKm: 55, aliases: ["saint petersburg", "st petersburg"] },

  // ── Pagoda template ────────────────────────────────────────────────────
  { id: "generic-pagoda", city: "Kyoto", country: "JP", lat: 35.0116, lon: 135.7681, radiusKm: 45, aliases: ["kyoto"] },
  { id: "generic-pagoda", city: "Nara", country: "JP", lat: 34.6851, lon: 135.8048, radiusKm: 30, aliases: ["nara"] },
  { id: "generic-pagoda", city: "Hanoi", country: "VN", lat: 21.0285, lon: 105.8542, radiusKm: 50, aliases: ["hanoi"] },
  { id: "generic-pagoda", city: "Ho Chi Minh City", country: "VN", lat: 10.8231, lon: 106.6297, radiusKm: 55, aliases: ["ho chi minh", "saigon"] },
  { id: "generic-pagoda", city: "Chiang Mai", country: "TH", lat: 18.7883, lon: 98.9853, radiusKm: 40, aliases: ["chiang mai"] },
  { id: "generic-pagoda", city: "Yangon", country: "MM", lat: 16.8409, lon: 96.1735, radiusKm: 45, aliases: ["yangon", "rangoon"] },
  { id: "generic-pagoda", city: "Xi'an", country: "CN", lat: 34.3416, lon: 108.9398, radiusKm: 50, aliases: ["xi'an", "xian"] },

  // ── Minaret / mosque template ──────────────────────────────────────────
  { id: "generic-minaret", city: "Istanbul", country: "TR", lat: 41.0082, lon: 28.9784, radiusKm: 60, aliases: ["istanbul", "constantinople"] },
  { id: "generic-minaret", city: "Ankara", country: "TR", lat: 39.9334, lon: 32.8597, radiusKm: 50, aliases: ["ankara"] },
  { id: "generic-minaret", city: "Marrakech", country: "MA", lat: 31.6295, lon: -7.9811, radiusKm: 40, aliases: ["marrakech", "marrakesh"] },
  { id: "generic-minaret", city: "Casablanca", country: "MA", lat: 33.5731, lon: -7.5898, radiusKm: 45, aliases: ["casablanca"] },
  { id: "generic-minaret", city: "Tunis", country: "TN", lat: 36.8065, lon: 10.1815, radiusKm: 40, aliases: ["tunis"] },
  { id: "generic-minaret", city: "Amman", country: "JO", lat: 31.9454, lon: 35.9284, radiusKm: 45, aliases: ["amman"] },
  { id: "generic-minaret", city: "Baghdad", country: "IQ", lat: 33.3152, lon: 44.3661, radiusKm: 55, aliases: ["baghdad"] },
  { id: "generic-minaret", city: "Tehran", country: "IR", lat: 35.6892, lon: 51.3890, radiusKm: 55, aliases: ["tehran"] },
  { id: "generic-minaret", city: "Karachi", country: "PK", lat: 24.8607, lon: 67.0011, radiusKm: 60, aliases: ["karachi"] },
  { id: "generic-minaret", city: "Lahore", country: "PK", lat: 31.5204, lon: 74.3587, radiusKm: 55, aliases: ["lahore"] },
  { id: "generic-minaret", city: "Dhaka", country: "BD", lat: 23.8103, lon: 90.4125, radiusKm: 55, aliases: ["dhaka"] },

  // ── Alpine template ────────────────────────────────────────────────────
  { id: "generic-alpine", city: "Zurich", country: "CH", lat: 47.3769, lon: 8.5417, radiusKm: 55, aliases: ["zurich", "zürich"] },
  { id: "generic-alpine", city: "Geneva", country: "CH", lat: 46.2044, lon: 6.1432, radiusKm: 40, aliases: ["geneva", "genève", "geneve"] },
  { id: "generic-alpine", city: "Bern", country: "CH", lat: 46.9480, lon: 7.4474, radiusKm: 35, aliases: ["bern", "berne"] },
  { id: "generic-alpine", city: "Innsbruck", country: "AT", lat: 47.2692, lon: 11.4041, radiusKm: 35, aliases: ["innsbruck"] },
  { id: "generic-alpine", city: "Salzburg", country: "AT", lat: 47.8095, lon: 13.0550, radiusKm: 35, aliases: ["salzburg"] },
  { id: "generic-alpine", city: "Oslo", country: "NO", lat: 59.9139, lon: 10.7522, radiusKm: 55, aliases: ["oslo"] },
  { id: "generic-alpine", city: "Bergen", country: "NO", lat: 60.3913, lon: 5.3221, radiusKm: 40, aliases: ["bergen"] },
  { id: "generic-alpine", city: "Reykjavik", country: "IS", lat: 64.1466, lon: -21.9426, radiusKm: 45, aliases: ["reykjavik", "reykjavík"] },
  { id: "generic-alpine", city: "Helsinki", country: "FI", lat: 60.1699, lon: 24.9384, radiusKm: 50, aliases: ["helsinki"] },
  { id: "generic-alpine", city: "Anchorage", country: "US", lat: 61.2181, lon: -149.9003, radiusKm: 60, aliases: ["anchorage"] },
  { id: "generic-alpine", city: "Calgary", country: "CA", lat: 51.0447, lon: -114.0719, radiusKm: 55, aliases: ["calgary", "banff"] },
  { id: "generic-alpine", city: "Boulder / Aspen", country: "US", lat: 39.5501, lon: -105.7821, radiusKm: 80, aliases: ["boulder", "aspen"] },

  // ── Tropical template ──────────────────────────────────────────────────
  { id: "generic-tropical", city: "Honolulu", country: "US", lat: 21.3099, lon: -157.8581, radiusKm: 60, aliases: ["honolulu", "hawaii", "waikiki"] },
  { id: "generic-tropical", city: "Nassau", country: "BS", lat: 25.0343, lon: -77.3963, radiusKm: 40, aliases: ["nassau", "bahamas"] },
  { id: "generic-tropical", city: "Havana", country: "CU", lat: 23.1136, lon: -82.3666, radiusKm: 45, aliases: ["havana", "la habana"] },
  { id: "generic-tropical", city: "San Juan", country: "PR", lat: 18.4655, lon: -66.1057, radiusKm: 45, aliases: ["san juan", "puerto rico"] },
  { id: "generic-tropical", city: "Cancún", country: "MX", lat: 21.1619, lon: -86.8515, radiusKm: 45, aliases: ["cancun", "cancún"] },
  { id: "generic-tropical", city: "Bali", country: "ID", lat: -8.3405, lon: 115.0920, radiusKm: 60, aliases: ["bali", "denpasar", "kuta", "ubud"] },
  { id: "generic-tropical", city: "Phuket", country: "TH", lat: 7.8804, lon: 98.3923, radiusKm: 45, aliases: ["phuket"] },
  { id: "generic-tropical", city: "Fiji", country: "FJ", lat: -18.1248, lon: 178.4501, radiusKm: 100, aliases: ["fiji", "suva"] },
  { id: "generic-tropical", city: "Maldives", country: "MV", lat: 4.1755, lon: 73.5093, radiusKm: 80, aliases: ["maldives", "malé", "male"] },
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
