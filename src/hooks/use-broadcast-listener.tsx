import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';

const DISMISSED_MESSAGES_KEY = 'dismissed_broadcast_messages';

function getDismissedMessages(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_MESSAGES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markMessageAsDismissed(messageId: string) {
  const dismissed = getDismissedMessages();
  dismissed.add(messageId);
  localStorage.setItem(DISMISSED_MESSAGES_KEY, JSON.stringify([...dismissed]));
}

function isMessageForUser(message: { audience?: string }, isSubscribed: boolean) {
  const audience = message.audience ?? 'all';
  if (audience === 'all') return true;
  if (audience === 'premium') return isSubscribed;
  if (audience === 'free') return !isSubscribed;
  return true;
}

export function useBroadcastListener() {
  const { isSubscribed } = useSubscription();
  const shownMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const dismissedMessages = getDismissedMessages();

    async function loadExistingMessages() {
      const { data: messages } = await supabase
        .from('broadcast_messages')
        .select('id,message,audience,is_active,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (messages) {
        messages.forEach((message) => {
          if (!isMessageForUser(message, isSubscribed)) return;

          if (!dismissedMessages.has(message.id) && !shownMessagesRef.current.has(message.id)) {
            shownMessagesRef.current.add(message.id);

            toast.info('Admin Announcement', {
              description: message.message,
              duration: Infinity,
              position: 'top-center',
              onDismiss: () => markMessageAsDismissed(message.id),
              onAutoClose: () => markMessageAsDismissed(message.id),
            });
          }
        });
      }
    }

    loadExistingMessages();

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
          const newMessage = payload.new as { id: string; message: string; audience?: string };

          if (!isMessageForUser(newMessage, isSubscribed)) return;

          if (!dismissedMessages.has(newMessage.id) && !shownMessagesRef.current.has(newMessage.id)) {
            shownMessagesRef.current.add(newMessage.id);

            toast.info('Admin Announcement', {
              description: newMessage.message,
              duration: Infinity,
              position: 'top-center',
              onDismiss: () => markMessageAsDismissed(newMessage.id),
              onAutoClose: () => markMessageAsDismissed(newMessage.id),
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