import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { WeatherSourceLabel } from '@/components/weather/weather-source-label';
import { isObservationTrusted } from '@/lib/skycam/skycamSource';
import type { SkyCamStation, SkyCamStationLatest } from '@/types/skycam';
import { useIsAdmin } from '@/hooks/use-is-admin';

const SKYCAM_ENABLED = import.meta.env.VITE_SKYCAM_ENABLED === 'true';

export default function SkyCamStationView() {
  const { stationCode } = useParams<{ stationCode: string }>();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [station, setStation] = useState<SkyCamStation | null>(null);
  const [latest, setLatest] = useState<SkyCamStationLatest | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!stationCode) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const { data: s } = await supabase.from('skycam_stations').select('*').eq('station_code', stationCode).maybeSingle();
      if (!s) { setBusy(false); return; }
      const { data: l } = await supabase.from('skycam_station_latest').select('*').eq('station_id', s.id).maybeSingle();
      let url: string | null = null;
      if (l?.image_path) {
        const { data: signed } = await supabase.storage.from('skycam-images').createSignedUrl(l.image_path, 600);
        url = signed?.signedUrl ?? null;
      }
      if (cancelled) return;
      setStation(s as SkyCamStation);
      setLatest((l as SkyCamStationLatest | null) ?? null);
      setSignedUrl(url);
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [stationCode]);

  // Access: enabled flag OR admin OR public station
  const accessAllowed = SKYCAM_ENABLED || isAdmin || (station?.is_public ?? false);

  if (busy) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-xl font-semibold">Station not found</h2>
          <Button className="mt-4" onClick={() => navigate('/')}>Home</Button>
        </div>
      </div>
    );
  }
  if (!accessAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-xl font-semibold">SkyCam disabled</h2>
          <p className="text-sm text-muted-foreground mt-2">This SkyCam is not publicly visible.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Home</Button>
        </div>
      </div>
    );
  }

  const trusted = isObservationTrusted(latest);

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="mb-4">
        <h1 className="text-3xl font-bold">{station.name}</h1>
        <p className="text-sm text-muted-foreground">{[station.area, station.city, station.country].filter(Boolean).join(' · ')}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted">
          {signedUrl ? (
            <img src={signedUrl} alt="SkyCam" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              No SkyCam image has been uploaded for this station yet.
            </div>
          )}
        </div>
        <div className="p-4 space-y-3">
          <WeatherSourceLabel
            source={trusted ? 'skycam' : 'api'}
            updatedAt={latest?.uploaded_at}
            stationName={station.name}
          />
          {latest && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Condition</div><div className="font-medium">{latest.condition_label ?? '—'}</div></div>
              <div><div className="text-xs text-muted-foreground">Cloud cover</div><div className="font-medium">{latest.cloud_cover_percent ?? '—'}%</div></div>
            </div>
          )}
          {latest?.rain_likely_soon && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              SkyCam suggests rain may be possible soon
            </div>
          )}
          {latest && !latest.ai_checked && (
            <p className="text-xs text-muted-foreground">AI check failed for this image.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
