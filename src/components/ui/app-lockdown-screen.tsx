import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

export function AppLockdownScreen() {
  const [message, setMessage] = useState('This app is currently unavailable.');

  useEffect(() => {
    async function fetchMessage() {
      const { data } = await supabase
        .from('broadcast_messages')
        .select('message')
        .eq('locks_app', true)
        .eq('is_active', true)
        .eq('is_emergency', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.message) setMessage(data.message);
    }
    fetchMessage();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-6 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Rainz</h1>
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10">
          <p className="text-sm text-destructive font-medium">{message}</p>
        </div>
        <p className="text-xs text-muted-foreground">Please check back later.</p>
      </div>
    </div>
  );
}
