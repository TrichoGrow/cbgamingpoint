import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeWallet } from '@/hooks/useRealtimeWallet';
import { useRealtimeTournaments } from '@/hooks/useRealtimeTournaments';
import Navbar from '@/components/Navbar';
import FloatingSupport from '@/components/FloatingSupport';
import StatCard from '@/components/StatCard';
import { Wallet, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface DashboardStats {
  walletBalance: number;
  totalMatches: number;
  wins: number;
  totalEarnings: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: 0, totalMatches: 0, wins: 0, totalEarnings: 0,
  });
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
    const { data: participants } = await supabase.from('participants').select('id, placement').eq('user_id', user.id);
    const { data: earnings } = await supabase.from('wallet_transactions').select('amount').eq('user_id', user.id).eq('type', 'prize');
    const totalEarnings = earnings?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({
      walletBalance: profile?.wallet_balance || 0,
      totalMatches: participants?.length || 0,
      wins: participants?.filter(p => p.placement === 1).length || 0,
      totalEarnings,
    });
  }, [user]);

  const loadUpcoming = useCallback(async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*, games(name, logo_url)')
      .eq('status', 'upcoming')
      .order('start_time', { ascending: true })
      .limit(5);
    setUpcomingTournaments(data || []);
  }, []);

  const refresh = useCallback(() => {
    loadStats();
    loadUpcoming();
  }, [loadStats, loadUpcoming]);

  useRealtimeWallet(user?.id, refresh);
  useRealtimeTournaments(refresh);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadUpcoming();
  }, [user, loadStats, loadUpcoming]);

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          Welcome back, <span className="text-primary glow-text">Warrior</span>
        </h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard title="Wallet" value={`₹${stats.walletBalance}`} icon={<Wallet className="h-5 w-5" />} />
          <StatCard title="Matches" value={stats.totalMatches} icon={<Target className="h-5 w-5" />} />
          <StatCard title="Wins" value={stats.wins} icon={<Trophy className="h-5 w-5" />} />
          <StatCard title="Earnings" value={`₹${stats.totalEarnings}`} icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">Upcoming Tournaments</h2>
            <Link to="/tournaments">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          {upcomingTournaments.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No upcoming tournaments</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map(t => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:glow-card">
                  <div className="flex items-center gap-3 mb-3">
                    {t.games?.logo_url && (
                      <img src={t.games.logo_url} alt={t.games?.name} className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-display font-bold text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.games?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Entry: <span className="text-primary font-semibold">₹{t.entry_fee}</span></span>
                    <span className="text-muted-foreground">Prize: <span className="text-success font-semibold">₹{t.prize_pool}</span></span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t.slots_filled || 0}/{t.total_slots} slots
                    </span>
                    <Link to="/tournaments">
                      <Button size="sm">Join</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
