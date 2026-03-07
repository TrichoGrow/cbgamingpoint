import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeTournaments(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('realtime-tournaments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => onUpdate()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onUpdate]);
}
