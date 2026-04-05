import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import FloatingSupport from '@/components/FloatingSupport';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Medal } from 'lucide-react';

const MyTournamentsPage = () => {
  const { user } = useAuth();
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMyTournaments();
  }, [user]);

  const loadMyTournaments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('participants')
      .select('*, tournaments(*, games(name, logo_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setParticipations(data || []);
    setLoading(false);
  };

  const statusColor = (status: string) => {
    if (status === 'live') return 'bg-success text-success-foreground';
    if (status === 'upcoming') return 'bg-primary text-primary-foreground';
    if (status === 'completed') return 'bg-muted text-muted-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <Trophy className="inline h-6 w-6 text-primary mr-2" />
          My Tournaments
        </h1>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : participations.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">You haven't joined any tournaments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {participations.map(p => {
              const t = p.tournaments;
              if (!t) return null;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {t.games?.logo_url && (
                        <img src={t.games.logo_url} alt={t.games?.name} className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <h3 className="font-display font-bold text-foreground">{t.title}</h3>
                        <p className="text-xs text-muted-foreground">{t.games?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor(t.status)}>{t.status}</Badge>
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
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-background p-2 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground">Entry Fee</p>
                      <p className="text-xs font-bold text-primary">{t.entry_fee > 0 ? `₹${t.entry_fee}` : 'FREE'}</p>
                    </div>
                    <div className="rounded-lg bg-background p-2 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground">Prize Pool</p>
                      <p className="text-xs font-bold text-success">₹{t.prize_pool}</p>
                    </div>
                    <div className="rounded-lg bg-background p-2 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground">Date</p>
                      <p className="text-xs font-bold text-foreground">{new Date(t.start_time).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {/* Show room details for live tournaments */}
                  {t.status === 'live' && t.room_id && (
                    <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs font-semibold text-primary">Room Details</p>
                      <p className="text-xs text-foreground">Room ID: <span className="font-bold">{t.room_id}</span></p>
                      {t.room_password && <p className="text-xs text-foreground">Password: <span className="font-bold">{t.room_password}</span></p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FloatingSupport />
    </div>
  );
};

export default MyTournamentsPage;
