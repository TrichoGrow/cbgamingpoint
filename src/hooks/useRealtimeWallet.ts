import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeWallet(userId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`realtime-wallet-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => onUpdate()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, onUpdate]);
}
