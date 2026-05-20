import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Camera, Cloud, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface SkyCamSubmissionDialogProps {
  location?: string;
  locationData?: { latitude: number; longitude: number; city?: string; area?: string; country?: string };
  trigger?: React.ReactNode;
}

const CONDITIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'partly_cloudy', label: 'Partly cloudy' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
  { value: 'storm', label: 'Storm' },
  { value: 'other', label: 'Other' },
];

const MAX_BYTES = 10 * 1024 * 1024;

export function SkyCamSubmissionDialog({ location, locationData, trigger }: SkyCamSubmissionDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [forecastAccurate, setForecastAccurate] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null); setPreview(null); setForecastAccurate(''); setCondition('');
    setNote(''); setSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('Image too large. Maximum 10MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to submit a SkyCam photo.');
      return;
    }
    if (!file) {
      toast.error('Please add a sky photo.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('image', file);
      if (locationData?.latitude != null) form.append('latitude', String(locationData.latitude));
      if (locationData?.longitude != null) form.append('longitude', String(locationData.longitude));
      if (locationData?.city) form.append('city', locationData.city);
      if (locationData?.area) form.append('area', locationData.area);
      if (locationData?.country) form.append('country', locationData.country);
      form.append('captured_at', new Date().toISOString());
      if (forecastAccurate) form.append('forecast_was_accurate', forecastAccurate);
      if (condition) form.append('user_condition_label', condition);
      if (note.trim()) form.append('user_note', note.trim());

      const { data, error } = await supabase.functions.invoke('submit-skycam-photo', {
        body: form,
      });
      if (error) throw error;
      if (!data || (data as { success?: boolean }).success === false) {
        throw new Error((data as { error?: string })?.error ?? 'Submission failed');
      }

      setSuccess(true);
      toast.success('Thanks — your SkyCam photo was submitted.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Camera className="w-4 h-4" />
            Rainz SkyCam
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-primary/5 border-b border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Rainz SkyCam
            </DialogTitle>
            <DialogDescription>
              Help Rainz check the sky near you{location ? ` in ${location}` : ''}.
            </DialogDescription>
          </DialogHeader>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Thanks — your SkyCam photo was submitted.</h3>
            <p className="text-sm text-muted-foreground">
              We’ll review it shortly. Approved photos help improve local weather confidence.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Rainz SkyCam rules</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Point your camera mostly at the sky.</li>
                <li>Do not include faces or private windows.</li>
                <li>Avoid car number plates if possible.</li>
                <li>Do not take photos while driving.</li>
                <li>Do not trespass to take a photo.</li>
                <li>A bit of roof, trees or horizon is fine.</li>
                <li>Only submit photos you took yourself.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Sky photo</Label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:opacity-90"
              />
              {preview && (
                <img
                  src={preview}
                  alt="SkyCam preview"
                  className="mt-2 w-full max-h-64 object-cover rounded-md border border-border"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Was the forecast accurate?</Label>
              <Select value={forecastAccurate} onValueChange={setForecastAccurate}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes, accurate</SelectItem>
                  <SelectItem value="false">No, not accurate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current weather</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything you want us to know?"
                rows={2}
                maxLength={500}
              />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full h-11">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" />Submit SkyCam photo</>
              )}
            </Button>

            {!user && (
              <p className="text-xs text-center text-muted-foreground">
                You need to be signed in to submit a SkyCam photo.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
