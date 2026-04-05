import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Medal, Users } from 'lucide-react';

interface Props {
  tournamentId: string;
  tournamentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Participant {
  id: string;
  user_id: string;
  placement: number | null;
  status: string;
  email?: string;
  in_game_name?: string;
}

const TournamentParticipants = ({ tournamentId, tournamentTitle, open, onOpenChange }: Props) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadParticipants();
  }, [open, tournamentId]);

  const loadParticipants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('participants')
      .select('id, user_id, placement, status')
      .eq('tournament_id', tournamentId)
      .order('placement', { ascending: true, nullsFirst: false });

    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, in_game_name')
        .in('id', userIds);

      const merged = data.map(p => {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        return { ...p, email: profile?.email || undefined, in_game_name: profile?.in_game_name || undefined };
      });

      // Sort: placement first (1,2,3...), then nulls
      merged.sort((a, b) => {
        if (a.placement && b.placement) return a.placement - b.placement;
        if (a.placement) return -1;
        if (b.placement) return 1;
        return 0;
      });

      setParticipants(merged);
    } else {
      setParticipants([]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> {tournamentTitle}
          </DialogTitle>
          <DialogDescription>Participants & Rankings</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : participants.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No participants yet</p>
        ) : (
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between rounded-lg border p-3 ${
                p.placement === 1 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-background'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-muted-foreground text-sm">
                    {p.placement || (i + 1)}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {p.in_game_name || p.email?.split('@')[0] || 'Player'}
                    </p>
                    {p.in_game_name && p.email && (
                      <p className="text-[10px] text-muted-foreground">{p.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.placement === 1 && (
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 gap-1">
                      <Medal className="h-3 w-3" /> Winner
                    </Badge>
                  )}
                  {p.placement && p.placement > 1 && (
                    <Badge variant="secondary">#{p.placement}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TournamentParticipants;
