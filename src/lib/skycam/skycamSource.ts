// Rainz SkyCam — client-side source decision logic.
// Decides whether the current weather UI should label data as "Data from SkyCam"
// or "Data from API", based on nearby trusted SkyCam stations.

import { supabase } from '@/integrations/supabase/client';
import type {
  SkyCamStation,
  SkyCamStationLatest,
  SkyCamWeatherSourceDecision,
} from '@/types/skycam';

const MAX_AGE_MINUTES = 10;
const MIN_QUALITY = 70;
const MIN_CONFIDENCE = 0.75;

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
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

export function isObservationFresh(capturedAtIso: string | null): boolean {
  if (!capturedAtIso) return false;
  const ts = Date.parse(capturedAtIso);
  if (Number.isNaN(ts)) return false;
  const ageMin = (Date.now() - ts) / 60000;
  return ageMin >= 0 && ageMin <= MAX_AGE_MINUTES;
}

export function isObservationTrusted(latest: SkyCamStationLatest | null): boolean {
  if (!latest) return false;
  if (!latest.ai_checked) return false;
  if (!isObservationFresh(latest.captured_at)) return false;
  if ((latest.image_quality_score ?? 0) < MIN_QUALITY) return false;
  if ((latest.ai_confidence ?? 0) < MIN_CONFIDENCE) return false;
  return true;
}

export async function getNearbySkyCamStations(
  latitude: number,
  longitude: number,
  maxKm = 25,
): Promise<Array<SkyCamStation & { distanceKm: number }>> {
  const { data, error } = await supabase
    .from('skycam_stations')
    .select(
      'id,station_code,name,city,area,country,latitude,longitude,camera_direction,coverage_radius_km,display_for_city,is_active,is_public,owner_name,created_at,updated_at',
    )
    .eq('is_active', true);
  if (error || !data) return [];

  return (data as SkyCamStation[])
    .map((s) => ({
      ...s,
      distanceKm: calculateDistanceKm(latitude, longitude, s.latitude, s.longitude),
    }))
    .filter((s) => s.distanceKm <= Math.max(maxKm, s.coverage_radius_km))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getLatestTrustedSkyCamObservation(
  latitude: number,
  longitude: number,
): Promise<{
  station: SkyCamStation;
  latest: SkyCamStationLatest;
  distanceKm: number;
} | null> {
  const stations = await getNearbySkyCamStations(latitude, longitude);
  if (stations.length === 0) return null;

  const ids = stations.map((s) => s.id);
  const { data, error } = await supabase
    .from('skycam_station_latest')
    .select('*')
    .in('station_id', ids);
  if (error || !data) return null;

  for (const station of stations) {
    const latest = (data as SkyCamStationLatest[]).find(
      (l) => l.station_id === station.id,
    );
    if (!latest) continue;
    if (station.distanceKm > station.coverage_radius_km) continue;
    if (isObservationTrusted(latest)) {
      return { station, latest, distanceKm: station.distanceKm };
    }
  }
  return null;
}

export async function decideWeatherSource(
  latitude: number,
  longitude: number,
): Promise<SkyCamWeatherSourceDecision> {
  try {
    const hit = await getLatestTrustedSkyCamObservation(latitude, longitude);
    if (hit) {
      return {
        source: 'skycam',
        station: hit.station,
        latest: hit.latest,
        distanceKm: hit.distanceKm,
        reason: 'trusted_nearby_station',
      };
    }
  } catch {
    // fall through to api
  }
  return {
    source: 'api',
    station: null,
    latest: null,
    distanceKm: null,
    reason: 'no_trusted_skycam',
  };
}

export interface LocationLike {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  name?: string | null;
}

/**
 * Decide whether a location search result should be labelled "Data from SkyCam".
 * Honors `display_for_city` so e.g. the Bispebjerg station can label all of Copenhagen.
 */
export async function shouldDisplaySkyCamForLocationSearch(
  location: LocationLike,
): Promise<SkyCamWeatherSourceDecision> {
  const lat = location.latitude ?? null;
  const lon = location.longitude ?? null;
  if (lat == null || lon == null) {
    return { source: 'api', station: null, latest: null, distanceKm: null, reason: 'missing_coords' };
  }

  // Direct nearby trusted check
  const trusted = await getLatestTrustedSkyCamObservation(lat, lon);
  if (trusted) {
    return {
      source: 'skycam',
      station: trusted.station,
      latest: trusted.latest,
      distanceKm: trusted.distanceKm,
      reason: 'trusted_nearby_station',
    };
  }

  // City-level display fallback
  const cityName = (location.city ?? location.name ?? '').toLowerCase().trim();
  if (cityName) {
    const { data } = await supabase
      .from('skycam_stations')
      .select(
        'id,station_code,name,city,area,country,latitude,longitude,camera_direction,coverage_radius_km,display_for_city,is_active,is_public,owner_name,created_at,updated_at',
      )
      .eq('is_active', true)
      .eq('display_for_city', true);

    const cityStations = ((data ?? []) as SkyCamStation[]).filter(
      (s) => s.city.toLowerCase().trim() === cityName,
    );
    if (cityStations.length > 0) {
      const ids = cityStations.map((s) => s.id);
      const { data: latests } = await supabase
        .from('skycam_station_latest')
        .select('*')
        .in('station_id', ids);
      for (const station of cityStations) {
        const latest = ((latests ?? []) as SkyCamStationLatest[]).find(
          (l) => l.station_id === station.id,
        );
        if (latest && isObservationTrusted(latest)) {
          return {
            source: 'skycam',
            station,
            latest,
            distanceKm: calculateDistanceKm(lat, lon, station.latitude, station.longitude),
            reason: 'display_for_city',
          };
        }
      }
    }
  }

  return { source: 'api', station: null, latest: null, distanceKm: null, reason: 'no_trusted_skycam' };
}
