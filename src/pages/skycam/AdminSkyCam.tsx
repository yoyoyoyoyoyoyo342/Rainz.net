import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SkyCamStation, SkyCamStationLatest, SkyCamUserSubmission } from '@/types/skycam';

interface Row { station: SkyCamStation; latest: SkyCamStationLatest | null; signedUrl: string | null; }

export default function AdminSkyCam() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<SkyCamUserSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const [{ data: stations }, { data: latests }, { data: subs }, { count: pCount }] = await Promise.all([
        supabase.from('skycam_stations').select('*').order('created_at', { ascending: false }),
        supabase.from('skycam_station_latest').select('*'),
        supabase.from('skycam_user_submissions').select('*').order('submitted_at', { ascending: false }).limit(12),
        supabase.from('skycam_user_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
      ]);

      const latestByStation = new Map<string, SkyCamStationLatest>();
      (latests as SkyCamStationLatest[] | null ?? []).forEach((l) => latestByStation.set(l.station_id, l));

      const out: Row[] = [];
      for (const s of (stations as SkyCamStation[] | null ?? [])) {
        const latest = latestByStation.get(s.id) ?? null;
        let signedUrl: string | null = null;
        if (latest?.image_path) {
          const { data } = await supabase.storage.from('skycam-images').createSignedUrl(latest.image_path, 600);
          signedUrl = data?.signedUrl ?? null;
        }
        out.push({ station: s, latest, signedUrl });
      }
      if (cancelled) return;
      setRows(out);
      setSubmissions((subs as SkyCamUserSubmission[] | null) ?? []);
      setPendingCount(pCount ?? 0);
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <Button onClick={() => navigate('/')}>Go home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to admin
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Cloud className="w-7 h-7" /> Rainz SkyCam</h1>
          <p className="text-muted-foreground">Live stations and pending user submissions</p>
        </div>
        <Link to="/admin/skycam-submissions">
          <Button variant="outline">Submissions ({pendingCount})</Button>
        </Link>
      </div>

      <h2 className="text-xl font-semibold mb-3">Stations</h2>
      {busy ? (
        <div className="text-sm text-muted-foreground">Loading stations…</div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No SkyCam stations yet.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ station, latest, signedUrl }) => (
            <Card key={station.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {signedUrl ? (
                  <img src={signedUrl} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No SkyCam image yet
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant={station.is_active ? 'default' : 'secondary'}>
                    {station.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant={station.is_public ? 'default' : 'outline'}>
                    {station.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div>
                  <div className="font-semibold">{station.name}</div>
                  <div className="text-xs text-muted-foreground">{station.station_code}</div>
                  <div className="text-xs text-muted-foreground">{[station.area, station.city, station.country].filter(Boolean).join(' · ')}</div>
                </div>
                {latest ? (
                  <div className="text-xs space-y-1">
                    <div>Condition: <span className="font-medium">{latest.condition_label ?? '—'}</span></div>
                    <div>Clouds: {latest.cloud_cover_percent ?? '—'}% · Quality: {latest.image_quality_score ?? '—'}</div>
                    <div>AI confidence: {latest.ai_confidence != null ? `${Math.round(latest.ai_confidence * 100)}%` : '—'}</div>
                    {latest.rain_likely_soon && (
                      <div className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> Rain likely soon</div>
                    )}
                    {!latest.ai_checked && (
                      <div className="flex items-center gap-1 text-muted-foreground"><AlertTriangle className="w-3 h-3" /> AI check failed</div>
                    )}
                    {latest.ai_checked && (
                      <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> AI checked</div>
                    )}
                    <div className="text-muted-foreground">Updated {latest.uploaded_at ? new Date(latest.uploaded_at).toLocaleString() : '—'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No observations yet.</div>
                )}
                <Link to={`/admin/skycam/${station.station_code}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">Open station</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mt-10 mb-3">Recent user submissions</h2>
      {submissions.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No user submissions yet.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((s) => (
            <Card key={s.id} className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant={s.status === 'pending_review' ? 'default' : 'outline'}>{s.status}</Badge>
                <span className="text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</span>
              </div>
              <div>Condition: {s.condition_label ?? '—'} · Rain soon: {s.rain_likely_soon ? 'yes' : 'no'}</div>
              {(s.city || s.country) && (
                <div className="text-muted-foreground">{[s.area, s.city, s.country].filter(Boolean).join(' · ')}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
