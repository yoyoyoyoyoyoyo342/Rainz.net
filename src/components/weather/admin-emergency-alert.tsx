import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export function AdminEmergencyAlert() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

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
          locks_app: false,
        } as any);

      if (error) throw error;
      toast.success('Emergency alert sent');
      setMessage('');
    } catch (error) {
      console.error('Error sending emergency:', error);
      toast.error('Failed to send emergency alert');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
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

        <div className="p-3 rounded-xl border border-border/30 bg-card/50">
          <p className="text-xs text-muted-foreground">
            App lockdown has been removed. Emergency alerts now send messages only.
          </p>
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
