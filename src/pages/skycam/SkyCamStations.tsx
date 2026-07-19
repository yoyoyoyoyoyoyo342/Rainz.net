import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Cloud, ArrowLeft, Plus, Copy, Check, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface MyStation {
  id: string;
  station_code: string;
  name: string;
  camera_type: 'normal' | 'noir';
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  is_active: boolean;
  last_upload_at: string | null;
  created_at: string;
}

export default function SkyCamStations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stations, setStations] = useState<MyStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ apiKey: string; uploadUrl: string; stationName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    station_name: '',
    latitude: '',
    longitude: '',
    city: '',
    country: '',
    camera_type: 'normal' as 'normal' | 'noir',
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('skycam_stations')
        .select('id, station_code, name, camera_type, latitude, longitude, city, country, is_active, last_upload_at, created_at')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        if (error) toast.error('Could not load your stations');
        setStations((data ?? []) as MyStation[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not available');
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(5),
        longitude: pos.coords.longitude.toFixed(5),
      })),
      () => toast.error('Could not get your location'),
    );
  };

  const onCreate = async () => {
    if (!form.station_name.trim()) return toast.error('Give your station a name');
    const lat = parseFloat(form.latitude); const lon = parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return toast.error('Enter valid coordinates');

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('register-skycam-station', {
      body: {
        station_name: form.station_name.trim(),
        latitude: lat,
        longitude: lon,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        camera_type: form.camera_type,
      },
    });
    setSubmitting(false);

    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Could not register station');
      return;
    }
    setOpenCreate(false);
    setCreatedKey({ apiKey: data.api_key, uploadUrl: data.upload_url, stationName: data.station.name });
    setForm({ station_name: '', latitude: '', longitude: '', city: '', country: '', camera_type: 'normal' });
    // refresh list
    const { data: refreshed } = await supabase
      .from('skycam_stations')
      .select('id, station_code, name, camera_type, latitude, longitude, city, country, is_active, last_upload_at, created_at')
      .eq('owner_user_id', user!.id)
      .order('created_at', { ascending: false });
    setStations((refreshed ?? []) as MyStation[]);
  };

  const copyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.apiKey);
    setCopied(true);
    toast.success('API key copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="text-muted-foreground mb-4">You need a Rejn account to register a SkyCam station.</p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Cloud className="w-7 h-7" /> My SkyCam Stations</h1>
          <p className="text-muted-foreground">Register a Pi or phone-based camera and get an API key for uploads.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}><Plus className="w-4 h-4 mr-2" /> Register station</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : stations.length === 0 ? (
        <Card className="p-8 text-center">
          <Cloud className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium mb-1">No stations yet</p>
          <p className="text-sm text-muted-foreground mb-4">Register a station to start contributing real sky photos to Rejn.</p>
          <Button onClick={() => setOpenCreate(true)}><Plus className="w-4 h-4 mr-2" /> Register station</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {stations.map((s) => (
            <Card key={s.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold truncate">{s.name}</div>
                  <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Disabled'}</Badge>
                  <Badge variant="outline">{s.camera_type === 'noir' ? 'Noir cam' : 'Normal cam'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.station_code}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.city, s.country].filter(Boolean).join(', ') || `${s.latitude.toFixed(3)}, ${s.longitude.toFixed(3)}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last upload: {s.last_upload_at ? new Date(s.last_upload_at).toLocaleString() : 'never'}
                </div>
              </div>
              <Link to={`/skycam/${s.station_code}`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register a SkyCam station</DialogTitle>
            <DialogDescription>You'll get an API key once. Copy it now — we never store the raw key.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="sn">Station name</Label>
              <Input id="sn" placeholder="My Rooftop in Aarhus"
                value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" placeholder="56.156" value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="lon">Longitude</Label>
                <Input id="lon" placeholder="10.207" value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={useMyLocation}>Use my location</Button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Aarhus" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" placeholder="Denmark" value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Camera type</Label>
              <Select value={form.camera_type}
                onValueChange={(v) => setForm({ ...form, camera_type: v as 'normal' | 'noir' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (visible light)</SelectItem>
                  <SelectItem value="noir">Noir (infrared / no-IR filter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={submitting}>{submitting ? 'Creating…' : 'Create station'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API key reveal dialog */}
      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Your SkyCam API key</DialogTitle>
            <DialogDescription>
              This key is shown <strong>once</strong>. Copy it now and paste it into your Pi's <code>.env</code> as <code>RAINZ_SKYCAM_API_KEY</code>. If you lose it, register a new station.
            </DialogDescription>
          </DialogHeader>
          {createdKey && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Station</Label>
                <div className="text-sm font-medium">{createdKey.stationName}</div>
              </div>
              <div>
                <Label className="text-xs">API key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={createdKey.apiKey} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={copyKey}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Upload URL</Label>
                <Input readOnly value={createdKey.uploadUrl} className="font-mono text-xs" />
              </div>
              <pre className="bg-muted p-3 rounded text-[10px] overflow-x-auto">
{`curl -X POST "${createdKey.uploadUrl}" \\
  -H "Authorization: Bearer ${createdKey.apiKey}" \\
  -F "image=@./sky.jpg"`}
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>I've copied it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
