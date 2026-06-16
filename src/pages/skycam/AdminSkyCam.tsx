import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SkyCamStationLatest, SkyCamUserSubmission } from '@/types/skycam';

interface AdminStation {
  id: string;
  station_code: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  camera_type: 'normal' | 'noir' | null;
  is_active: boolean;
  is_public: boolean;
  owner_user_id: string | null;
  owner_email: string | null;
  last_upload_at: string | null;
  created_at: string;
}

interface Row { station: AdminStation; latest: SkyCamStationLatest | null; signedUrl: string | null; }

export default function AdminSkyCam() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<SkyCamUserSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    const [{ data: stations }, { data: latests }, { data: subs }, { count: pCount }] = await Promise.all([
      supabase.from('skycam_stations').select('*').order('created_at', { ascending: false }),
      supabase.from('skycam_station_latest').select('*'),
      supabase.from('skycam_user_submissions').select('*').order('submitted_at', { ascending: false }).limit(12),
      supabase.from('skycam_user_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    ]);

    const ownerIds = Array.from(new Set((stations ?? []).map((s: any) => s.owner_user_id).filter(Boolean)));
    const ownerNameByUser = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase.from('profiles')
        .select('user_id, display_name, username').in('user_id', ownerIds as string[]);
      (profs ?? []).forEach((p: any) => ownerNameByUser.set(p.user_id, p.display_name || p.username || p.user_id));
    }

    const latestByStation = new Map<string, SkyCamStationLatest>();
    (latests as SkyCamStationLatest[] | null ?? []).forEach((l) => latestByStation.set(l.station_id, l));

    const out: Row[] = [];
    for (const s of ((stations ?? []) as any[])) {
      const latest = latestByStation.get(s.id) ?? null;
      let signedUrl: string | null = null;
      if (latest?.image_path) {
        const { data } = await supabase.storage.from('skycam-images').createSignedUrl(latest.image_path, 600);
        signedUrl = data?.signedUrl ?? null;
      }
      out.push({
        station: {
          ...s,
          owner_email: s.owner_user_id ? (ownerNameByUser.get(s.owner_user_id) ?? null) : null,
        } as AdminStation,
        latest,
        signedUrl,
      });
    }
    setRows(out);
    setSubmissions((subs as SkyCamUserSubmission[] | null) ?? []);
    setPendingCount(pCount ?? 0);
    setBusy(false);
  }, []);

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin, refresh]);

  const toggleActive = async (stationId: string, next: boolean) => {
    const { error } = await supabase.from('skycam_stations')
      .update({ is_active: next }).eq('id', stationId);
    if (error) { toast.error('Could not update station'); return; }
    toast.success(next ? 'Station enabled' : 'Station disabled');
    setRows((prev) => prev.map((r) => r.station.id === stationId
      ? { ...r, station: { ...r.station, is_active: next } } : r));
  };

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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Cloud className="w-7 h-7" /> Rejn SkyCam</h1>
          <p className="text-muted-foreground">All registered stations and pending user submissions</p>
        </div>
        <Link to="/admin/skycam/submissions">
          <Button variant="outline">Submissions ({pendingCount})</Button>
        </Link>
      </div>

      <h2 className="text-xl font-semibold mb-3">Stations ({rows.length})</h2>
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
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  <Badge variant={station.is_active ? 'default' : 'destructive'}>
                    {station.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline">{station.camera_type === 'noir' ? 'Noir' : 'Normal'}</Badge>
                  {station.is_public && <Badge variant="secondary">Public</Badge>}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="font-semibold">{station.name}</div>
                  <div className="text-xs text-muted-foreground break-all">{station.station_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {[station.city, station.country].filter(Boolean).join(', ') || `${station.latitude.toFixed(3)}, ${station.longitude.toFixed(3)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Owner: {station.owner_email ?? <em>unknown</em>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last upload: {station.last_upload_at ? new Date(station.last_upload_at).toLocaleString() : 'never'}
                  </div>
                </div>
                {latest && (
                  <div className="text-xs space-y-1">
                    <div>Condition: <span className="font-medium">{latest.condition_label ?? '—'}</span> · Clouds {latest.cloud_cover_percent ?? '—'}%</div>
                    {latest.rain_likely_soon && (
                      <div className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> Rain likely soon</div>
                    )}
                    {latest.ai_checked && (
                      <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> AI checked</div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={station.is_active}
                      onCheckedChange={(v) => toggleActive(station.id, v)} />
                    <span className="text-xs">{station.is_active ? 'Active' : 'Disabled'}</span>
                  </div>
                  <Link to={`/admin/skycam/stations/${station.station_code}`}>
                    <Button variant="outline" size="sm">Open</Button>
                  </Link>
                </div>
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
