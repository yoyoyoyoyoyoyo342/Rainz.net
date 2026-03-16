import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, ShieldOff, Lock } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/use-feature-flags';

export function AdminEmergencyAlert() {
  const [message, setMessage] = useState('');
  const [locksApp, setLocksApp] = useState(false);
  const [sending, setSending] = useState(false);
  const [lifting, setLifting] = useState(false);
  const { isEnabled, toggleFlag } = useFeatureFlags();

  const isLocked = isEnabled('app_lockdown', false);

  async function sendEmergency() {
    if (!message.trim()) {
      toast.error('Please enter an emergency message');
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          message: message.trim(),
          audience: 'all',
          is_emergency: true,
          locks_app: locksApp,
        } as any);

      if (error) throw error;

      if (locksApp) {
        await supabase
          .from('feature_flags')
          .update({ enabled: true, updated_at: new Date().toISOString() })
          .eq('key', 'app_lockdown');
      }

      toast.success('Emergency alert sent');
      setMessage('');
    } catch (error) {
      console.error('Error sending emergency:', error);
      toast.error('Failed to send emergency alert');
    } finally {
      setSending(false);
    }
  }

  async function liftLockdown() {
    try {
      setLifting(true);

      // Deactivate all emergency messages that lock the app
      await supabase
        .from('broadcast_messages')
        .update({ is_active: false })
        .eq('locks_app', true)
        .eq('is_active', true);

      // Disable the lockdown flag
      await supabase
        .from('feature_flags')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('key', 'app_lockdown');

      toast.success('Lockdown lifted');
    } catch (error) {
      console.error('Error lifting lockdown:', error);
      toast.error('Failed to lift lockdown');
    } finally {
      setLifting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isLocked ? 'border-destructive/50 bg-destructive/10' : 'border-green-500/30 bg-green-500/10'}`}>
        {isLocked ? (
          <Lock className="w-5 h-5 text-destructive" />
        ) : (
          <ShieldOff className="w-5 h-5 text-green-500" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isLocked ? '🔴 App is LOCKED' : '🟢 App is operating normally'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLocked ? 'Users cannot access the app. Lift the lockdown below.' : 'No active lockdown.'}
          </p>
        </div>
        {isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={liftLockdown}
            disabled={lifting}
          >
            {lifting ? 'Lifting...' : 'Lift Lockdown'}
          </Button>
        )}
      </div>

      {/* Send emergency */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emergency-msg" className="text-sm font-medium">Emergency Message</Label>
          <Textarea
            id="emergency-msg"
            placeholder="Describe the emergency situation..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
          <Switch checked={locksApp} onCheckedChange={setLocksApp} />
          <div>
            <p className="text-sm font-medium text-foreground">Lock entire app</p>
            <p className="text-xs text-muted-foreground">Block all users from accessing the app until lifted</p>
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={sendEmergency}
          disabled={sending || !message.trim()}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {sending ? 'Sending...' : 'Send Emergency Alert'}
        </Button>
      </div>
    </div>
  );
}
