import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Users } from 'lucide-react';

export function BroadcastMessage() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUserCount();
  }, [audience]);

  async function loadUserCount() {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });
      
      if (error) throw error;
      setUserCount(count);
    } catch (error) {
      console.error('Error loading user count:', error);
    }
  }

  async function sendPushToAllSubscribers(title: string, body: string) {
    try {
      // Get all push-subscribed user IDs
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('user_id');
      
      if (error) {
        console.error('Error fetching push subscriptions:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscribers to notify');
        return;
      }

      // Deduplicate user IDs
      const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
      console.log(`Sending push to ${uniqueUserIds.length} subscribers`);

      // Send push notification to each subscriber
      const pushPromises = uniqueUserIds.map(userId =>
        supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: userId,
            title,
            body,
            data: { type: 'broadcast', skip_inbox: true },
          },
        }).catch(err => console.error(`Push failed for ${userId}:`, err))
      );

      await Promise.allSettled(pushPromises);
      console.log('Broadcast push notifications sent');
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  async function sendBroadcast() {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      
      const { error } = await supabase
        .from('broadcast_messages')
        .insert({
          message: message.trim(),
          audience,
          audience_filter: audience === 'all' ? {} : { type: audience }
        });

      if (error) throw error;

      // Send push notifications to all subscribed users
      await sendPushToAllSubscribers(
        '📢 Rainz Broadcast',
        message.trim()
      );

      toast({
        title: 'Success',
        description: `Message broadcasted to ${audience === 'all' ? 'all users' : audience + ' users'}`,
      });
      setMessage('');

    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to send broadcast message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Broadcast Message
        </CardTitle>
        <CardDescription>Send a notification to users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="premium">Premium Users Only</SelectItem>
              <SelectItem value="free">Free Users Only</SelectItem>
            </SelectContent>
          </Select>
          {userCount !== null && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" />
              Approximately {userCount} users will receive this
            </p>
          )}
        </div>

        <Textarea
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {message.length}/500 characters
          </span>
          <Button
            onClick={sendBroadcast}
            disabled={sending || !message.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
