import { useEffect, useState } from 'react';
import { Camera, Loader2, MapPin } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SkyCamStationViewerProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  className?: string;
}

interface NearbyStation {
  id: string;
  station_code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  coverage_radius_km: number;
  owner_name: string | null;
}

interface LatestObs {
  image_path: string | null;
  captured_at: string | null;
  condition_label: string | null;
  cloud_cover_percent: number | null;
  rain_likely_soon: boolean | null;
}

const BUCKET = 'skycam-images';
const MAX_DISTANCE_KM = 25;
const FRESH_HOURS = 24;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function SkyCamStationViewer({ latitude, longitude, className }: SkyCamStationViewerProps) {
  const [station, setStation] = useState<NearbyStation | null>(null);
  const [latest, setLatest] = useState<LatestObs | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (latitude == null || longitude == null) return;

    (async () => {
      try {
        const { data: stations, error } = await supabase
          .from('skycam_stations')
          .select('id,station_code,name,city,latitude,longitude,coverage_radius_km,owner_name,is_active,is_public')
          .eq('is_active', true)
          .eq('is_public', true);
        if (error || !stations || cancelled) return;

        let best: { st: NearbyStation; dist: number } | null = null;
        for (const s of stations as any[]) {
          const d = distanceKm(latitude, longitude, s.latitude, s.longitude);
          const radius = Math.max(s.coverage_radius_km ?? 0, MAX_DISTANCE_KM);
          if (d <= radius && (!best || d < best.dist)) {
            best = { st: s as NearbyStation, dist: d };
          }
        }
        if (!best) { setStation(null); setLatest(null); return; }

        const { data: latestRow } = await supabase
          .from('skycam_station_latest')
          .select('image_path,captured_at,condition_label,cloud_cover_percent,rain_likely_soon')
          .eq('station_id', best.st.id)
          .maybeSingle();

        if (cancelled) return;
        if (!latestRow?.image_path || !latestRow.captured_at) { setStation(null); return; }

        const ageMs = Date.now() - new Date(latestRow.captured_at).getTime();
        if (ageMs > FRESH_HOURS * 3600 * 1000) { setStation(null); return; }

        setStation(best.st);
        setLatest(latestRow as LatestObs);
      } catch {
        if (!cancelled) { setStation(null); setLatest(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [latitude, longitude]);

  useEffect(() => {
    if (!open || !latest?.image_path) return;
    setLoadingImg(true);
    setImageUrl(null);
    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(latest.image_path!, 60 * 10);
      if (!error && data?.signedUrl) setImageUrl(data.signedUrl);
      setLoadingImg(false);
    })();
  }, [open, latest?.image_path]);

  if (!station || !latest) return null;

  const captured = latest.captured_at ? new Date(latest.captured_at) : null;
  const minutesAgo = captured ? Math.round((Date.now() - captured.getTime()) / 60000) : null;
  const ageText = minutesAgo == null ? '' : minutesAgo < 60 ? `${minutesAgo}m ago`
    : `${Math.round(minutesAgo / 60)}h ago`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="View Rejn SkyCam image"
        className={`absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:opacity-90 active:scale-95 transition ${className ?? ''}`}
      >
        <Camera className="w-3.5 h-3.5" />
        SkyCam
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Camera className="w-5 h-5 text-primary" />
                Rejn SkyCam — {station.city}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <MapPin className="w-3 h-3" />
                {station.name}{ageText ? ` • ${ageText}` : ''}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="bg-black/40 aspect-video flex items-center justify-center">
            {loadingImg && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
            {imageUrl && !loadingImg && (
              <img
                src={imageUrl}
                alt={`Live sky over ${station.city}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Condition</span>
              <span className="font-medium capitalize">
                {latest.condition_label?.replace('_', ' ') ?? 'Unknown'}
              </span>
            </div>
            {latest.cloud_cover_percent != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cloud cover</span>
                <span className="font-medium">{Math.round(latest.cloud_cover_percent)}%</span>
              </div>
            )}
            {latest.rain_likely_soon != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rain likely soon</span>
                <span className="font-medium">{latest.rain_likely_soon ? 'Yes' : 'No'}</span>
              </div>
            )}
            {station.owner_name && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Camera hosted by {station.owner_name}
              </p>
            )}
            <Button onClick={() => setOpen(false)} className="w-full mt-2">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
