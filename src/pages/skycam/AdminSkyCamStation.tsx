import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SkyCamObservation, SkyCamStation, SkyCamStationLatest } from '@/types/skycam';
import { isObservationTrusted } from '@/lib/skycam/skycamSource';

export default function AdminSkyCamStation() {
  const { stationCode } = useParams<{ stationCode: string }>();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [station, setStation] = useState<SkyCamStation | null>(null);
  const [latest, setLatest] = useState<SkyCamStationLatest | null>(null);
  const [observations, setObservations] = useState<SkyCamObservation[]>([]);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!isAdmin || !stationCode) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const { data: s } = await supabase.from('skycam_stations').select('*').eq('station_code', stationCode).maybeSingle();
      if (!s) { setBusy(false); return; }
      const [{ data: l }, { data: obs }] = await Promise.all([
        supabase.from('skycam_station_latest').select('*').eq('station_id', s.id).maybeSingle(),
        supabase.from('skycam_observations').select('*').eq('station_id', s.id).order('captured_at', { ascending: false }).limit(30),
      ]);
      let url: string | null = null;
      if (l?.image_path) {
        const { data: signed } = await supabase.storage.from('skycam-images').createSignedUrl(l.image_path, 600);
        url = signed?.signedUrl ?? null;
      }
      if (cancelled) return;
      setStation(s as SkyCamStation);
      setLatest((l as SkyCamStationLatest | null) ?? null);
      setObservations((obs as SkyCamObservation[] | null) ?? []);
      setSignedUrl(url);
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, stationCode]);

  if (loading || busy) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-xl font-semibold">Station not found</h2>
          <Button className="mt-4" onClick={() => navigate('/admin/skycam')}>Back to SkyCam</Button>
        </div>
      </div>
    );
  }

  const trusted = isObservationTrusted(latest);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/admin/skycam')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to SkyCam
      </Button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{station.name}</h1>
          <p className="text-sm text-muted-foreground">{station.station_code}</p>
          <p className="text-sm text-muted-foreground">{[station.area, station.city, station.country].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="text-right text-sm">
          <Badge variant={trusted ? 'default' : 'outline'}>
            {trusted ? 'Data from SkyCam' : 'Data from API'}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">
            Coverage radius: {station.coverage_radius_km} km · {station.is_public ? 'Public' : 'Private'}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden mb-6">
        <div className="aspect-video bg-muted">
          {signedUrl ? (
            <img src={signedUrl} alt="Latest SkyCam" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No SkyCam image has been uploaded for this station yet.
            </div>
          )}
        </div>
        {latest && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Condition</div><div className="font-medium">{latest.condition_label ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Cloud cover</div><div className="font-medium">{latest.cloud_cover_percent ?? '—'}%</div></div>
            <div><div className="text-xs text-muted-foreground">Quality</div><div className="font-medium">{latest.image_quality_score ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">AI confidence</div><div className="font-medium">{latest.ai_confidence != null ? `${Math.round(latest.ai_confidence * 100)}%` : '—'}</div></div>
            {latest.rain_likely_soon && (
              <div className="col-span-full text-amber-600 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" /> Rain likely soon{latest.rain_likely_reason ? ` — ${latest.rain_likely_reason}` : ''}
              </div>
            )}
            {!latest.ai_checked && (
              <div className="col-span-full text-muted-foreground text-xs flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> AI check failed for this image.
              </div>
            )}
            {latest.ai_checked && (
              <div className="col-span-full text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> AI checked · updated {latest.uploaded_at ? new Date(latest.uploaded_at).toLocaleString() : '—'}
              </div>
            )}
          </div>
        )}
      </Card>

      <h2 className="text-xl font-semibold mb-3">Recent observations</h2>
      {observations.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No observations yet.</Card>
      ) : (
        <div className="space-y-2">
          {observations.map((o) => (
            <Card key={o.id} className="p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{new Date(o.captured_at).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {o.condition_label ?? '—'} · clouds {o.cloud_cover_percent ?? '—'}% · quality {o.image_quality_score ?? '—'}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {o.is_latest && <Badge>Latest</Badge>}
                {o.status === 'replaced' && (
                  <Badge variant="outline" className="text-muted-foreground">Image replaced and deleted</Badge>
                )}
                {o.status === 'ai_failed' && <Badge variant="destructive">AI failed</Badge>}
                {o.rain_likely_soon && <Badge variant="secondary">Rain soon</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
