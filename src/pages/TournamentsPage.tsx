import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTournaments } from '@/hooks/useRealtimeTournaments';
import Navbar from '@/components/Navbar';
import FloatingSupport from '@/components/FloatingSupport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TournamentParticipants from '@/components/TournamentParticipants';

const TournamentsPage = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [viewParticipants, setViewParticipants] = useState<any>(null);

  const refreshTournaments = useCallback(() => {
    loadTournaments();
    if (user) loadJoined();
  }, [user]);

  useRealtimeTournaments(refreshTournaments);

  useEffect(() => {
    loadGames();
    loadTournaments();
    if (user) loadJoined();
  }, [user]);

  const loadGames = async () => {
    const { data } = await supabase.from('games').select('*').eq('is_active', true);
    setGames(data || []);
  };

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*, games(name, logo_url)')
      .in('status', ['upcoming', 'live'])
      .order('start_time', { ascending: true });
    setTournaments(data || []);
    setLoading(false);
  };

  const loadJoined = async () => {
    if (!user) return;
    const { data } = await supabase.from('participants').select('tournament_id').eq('user_id', user.id);
    setJoinedIds(new Set(data?.map(p => p.tournament_id) || []));
  };

  const joinTournament = async (tournament: any) => {
    if (!user) return;
    if (joinedIds.has(tournament.id)) { toast.error('Already joined!'); return; }

    if (tournament.entry_fee > 0) {
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      if ((profile?.wallet_balance || 0) < tournament.entry_fee) {
        toast.error('Insufficient balance. Please deposit first.');
        return;
      }

      // Deduct from wallet
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile?.wallet_balance || 0) - tournament.entry_fee })
        .eq('id', user.id);
      if (updateError) { toast.error('Failed to deduct balance'); return; }

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -tournament.entry_fee,
        type: 'entry_fee',
        description: `Entry fee for ${tournament.title}`,
        reference_id: tournament.id,
      });
    }

    // Join tournament
    const { error } = await supabase.from('participants').insert({
      tournament_id: tournament.id,
      user_id: user.id,
      status: 'joined',
    });

    if (error) { toast.error('Failed to join'); return; }

    // Update slots
    await supabase.from('tournaments').update({
      slots_filled: (tournament.slots_filled || 0) + 1,
    }).eq('id', tournament.id);

    toast.success('Joined successfully!');
    loadTournaments();
    loadJoined();
  };

  const filtered = tournaments.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (gameFilter !== 'all' && t.game_id !== gameFilter) return false;
    if (typeFilter === 'free' && t.entry_fee > 0) return false;
    if (typeFilter === 'paid' && t.entry_fee === 0) return false;
    return true;
  });

  const statusColor = (status: string) => {
    if (status === 'live') return 'bg-success text-success-foreground';
    if (status === 'upcoming') return 'bg-primary text-primary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <Trophy className="inline h-6 w-6 text-primary mr-2" />
          Tournaments
        </h1>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tournaments..." className="pl-10 bg-card border-border" />
          </div>
          <Select value={gameFilter} onValueChange={setGameFilter}>
            <SelectTrigger className="w-[150px] bg-card border-border">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px] bg-card border-border">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tournaments found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(t => (
              <div key={t.id} className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:glow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {t.games?.logo_url && (
                      <img src={t.games.logo_url} alt={t.games?.name} className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <h3 className="font-display font-bold text-foreground leading-tight">{t.title}</h3>
                      <p className="text-xs text-muted-foreground">{t.games?.name}</p>
                    </div>
                  </div>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-lg bg-background p-2 text-center border border-border">
                    <p className="text-xs text-muted-foreground">Entry Fee</p>
                    <p className="font-display font-bold text-primary">{t.entry_fee > 0 ? `₹${t.entry_fee}` : 'FREE'}</p>
                  </div>
                  <div className="rounded-lg bg-background p-2 text-center border border-border">
                    <p className="text-xs text-muted-foreground">Prize Pool</p>
                    <p className="font-display font-bold text-success">₹{t.prize_pool}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {t.slots_filled || 0}/{t.total_slots}
                    <Clock className="h-3 w-3 ml-2" />
                    {new Date(t.start_time).toLocaleDateString()}
                  </div>
                  {joinedIds.has(t.id) ? (
                    <Badge variant="secondary">Joined</Badge>
                  ) : (t.slots_filled || 0) >= t.total_slots ? (
                    <Badge variant="secondary">Full</Badge>
                  ) : (
                    <Button size="sm" onClick={() => joinTournament(t)}>Join Now</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FloatingSupport />
    </div>
  );
};

export default TournamentsPage;
