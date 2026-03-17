import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';

/**
 * Only shows toast popups for emergency alerts.
 * Regular admin announcements are handled by the inbox (header-info-bar).
 */
export function useBroadcastListener() {
  const { isSubscribed } = useSubscription();
  const shownMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only load and display emergency messages as toasts
    async function loadEmergencyMessages() {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: messages } = await supabase
        .from('broadcast_messages')
        .select('id,message,audience,is_active,is_emergency,created_at')
        .eq('is_active', true)
        .filter('is_emergency', 'eq', true)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (messages) {
        messages.forEach((message) => {
          const audience = (message as any).audience ?? 'all';
          if (audience === 'premium' && !isSubscribed) return;
          if (audience === 'free' && isSubscribed) return;

          if (!shownMessagesRef.current.has(message.id)) {
            shownMessagesRef.current.add(message.id);
            toast.error('⚠️ Emergency Alert', {
              description: message.message,
              duration: Infinity,
              position: 'top-center',
            });
          }
        });
      }
    }

    loadEmergencyMessages();

    const channel = supabase
      .channel('broadcast-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Only show toast for emergency alerts
          if (newMessage.is_emergency !== true) return;

          const audience = newMessage.audience ?? 'all';
          if (audience === 'premium' && !isSubscribed) return;
          if (audience === 'free' && isSubscribed) return;

          if (!shownMessagesRef.current.has(newMessage.id)) {
            shownMessagesRef.current.add(newMessage.id);
            toast.error('⚠️ Emergency Alert', {
              description: newMessage.message,
              duration: Infinity,
              position: 'top-center',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSubscribed]);
}
