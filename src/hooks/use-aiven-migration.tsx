import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Fires once per session per user: invokes `migrate-user-to-aiven` which
// copies the user's Supabase rows into Aiven. Idempotent server-side, so even
// if this runs more than once it's safe — the second call short-circuits with
// `already_migrated`.
const SESSION_FLAG_PREFIX = 'rejn-aiven-migrated-';

export function useAivenMigration() {
  const ran = useRef(false);

  useEffect(() => {
    const trigger = async (userId: string) => {
      const flag = `${SESSION_FLAG_PREFIX}${userId}`;
      if (sessionStorage.getItem(flag) === '1') return;
      sessionStorage.setItem(flag, '1');
      try {
        const { data, error } = await supabase.functions.invoke('migrate-user-to-aiven', {
          method: 'POST',
          body: {},
        });
        if (error) {
          console.warn('[aiven-migration] failed', error);
          sessionStorage.removeItem(flag); // allow retry next session
          return;
        }
        console.log('[aiven-migration]', data);
      } catch (e) {
        console.warn('[aiven-migration] threw', e);
        sessionStorage.removeItem(flag);
      }
    };

    // Fire for current session if already authed.
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (uid && !ran.current) {
        ran.current = true;
        void trigger(uid);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.id) {
        void trigger(session.user.id);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
}
