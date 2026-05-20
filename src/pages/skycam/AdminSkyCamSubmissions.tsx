import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SkyCamUserSubmission } from '@/types/skycam';

interface Row { sub: SkyCamUserSubmission; signedUrl: string | null; }

export default function AdminSkyCamSubmissions() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase
      .from('skycam_user_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(50);
    const out: Row[] = [];
    for (const s of (data as SkyCamUserSubmission[] | null ?? [])) {
      const { data: signed } = await supabase.storage.from('skycam-images').createSignedUrl(s.image_path, 600);
      out.push({ sub: s, signedUrl: signed?.signedUrl ?? null });
    }
    setRows(out);
    setBusy(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const approve = async (id: string, approved: boolean) => {
    const { error } = await supabase.from('skycam_user_submissions').update({
      is_approved: approved,
      status: approved ? 'approved' : 'rejected',
    }).eq('id', id);
    if (error) toast.error('Update failed');
    else { toast.success(approved ? 'Approved' : 'Rejected'); load(); }
  };

  const togglePublic = async (id: string, makePublic: boolean) => {
    const { error } = await supabase.from('skycam_user_submissions').update({ is_public: makePublic }).eq('id', id);
    if (error) toast.error('Update failed');
    else load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center">Access denied</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/admin/skycam')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to SkyCam
      </Button>
      <h1 className="text-3xl font-bold mb-1">SkyCam submissions</h1>
      <p className="text-sm text-muted-foreground mb-6">Pending user-submitted SkyCam photos</p>

      {busy ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No submissions yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ sub, signedUrl }) => (
            <Card key={sub.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {signedUrl ? (
                  <img src={signedUrl} alt="submission" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">image unavailable</div>
                )}
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant={sub.status === 'pending_review' ? 'default' : 'outline'}>{sub.status}</Badge>
                  <span className="text-muted-foreground">{new Date(sub.submitted_at).toLocaleString()}</span>
                </div>
                <div>AI: {sub.condition_label ?? '—'} · clouds {sub.cloud_cover_percent ?? '—'}%</div>
                {sub.rain_likely_soon && <div className="text-amber-600">Rain likely soon</div>}
                <div className="text-muted-foreground">User: {sub.user_condition_label ?? '—'}</div>
                {sub.forecast_was_accurate != null && (
                  <div className="text-muted-foreground">Forecast accurate: {sub.forecast_was_accurate ? 'yes' : 'no'}</div>
                )}
                {sub.user_note && <div className="italic">“{sub.user_note}”</div>}
                {(sub.city || sub.country) && (
                  <div className="text-muted-foreground">{[sub.area, sub.city, sub.country].filter(Boolean).join(' · ')}</div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch checked={sub.is_public} onCheckedChange={(v) => togglePublic(sub.id, v)} />
                    <span>Public</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => approve(sub.id, false)}>
                      <X className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={() => approve(sub.id, true)}>
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
