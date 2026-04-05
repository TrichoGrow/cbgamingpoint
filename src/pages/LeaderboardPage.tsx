import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import FloatingSupport from '@/components/FloatingSupport';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaderboardEntry {
  user_id: string;
  email: string;
  in_game_name: string | null;
  wins: number;
  total_earnings: number;
  total_matches: number;
}

const LeaderboardPage = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // Get all participants with placement = 1 (winners)
    const { data: participants } = await supabase
      .from('participants')
      .select('user_id, placement');

    if (!participants) { setLoading(false); return; }

    // Get prize earnings
    const { data: prizes } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount')
      .eq('type', 'prize');

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, in_game_name');

    // Aggregate per user
    const userMap = new Map<string, LeaderboardEntry>();

    for (const p of participants) {
      if (!userMap.has(p.user_id)) {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        userMap.set(p.user_id, {
          user_id: p.user_id,
          email: profile?.email || 'Unknown',
          in_game_name: profile?.in_game_name || null,
          wins: 0,
          total_earnings: 0,
          total_matches: 0,
        });
      }
      const entry = userMap.get(p.user_id)!;
      entry.total_matches++;
      if (p.placement === 1) entry.wins++;
    }

    // Add earnings
    for (const pr of prizes || []) {
      const entry = userMap.get(pr.user_id);
      if (entry) entry.total_earnings += Number(pr.amount);
    }

    const sorted = Array.from(userMap.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.total_earnings - a.total_earnings;
    });

    setLeaders(sorted.slice(0, 50));
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <Trophy className="inline h-6 w-6 text-primary mr-2" />
          Leaderboard
        </h1>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : leaders.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tournament results yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[50px_1fr_80px_100px_100px] gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-center">Matches</span>
              <span className="text-center">Wins</span>
              <span className="text-right">Earnings</span>
            </div>

            {leaders.map((entry, i) => (
              <div
                key={entry.user_id}
                className={`grid grid-cols-[40px_1fr_auto] md:grid-cols-[50px_1fr_80px_100px_100px] gap-3 items-center rounded-lg border bg-card p-4 transition-all hover:border-primary/40 ${
                  i === 0 ? 'border-yellow-500/50 bg-yellow-500/5' :
                  i === 1 ? 'border-gray-400/30' :
                  i === 2 ? 'border-amber-700/30' : 'border-border'
                }`}
              >
                <div className="flex justify-center">{getRankIcon(i)}</div>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">
                    {entry.in_game_name || entry.email?.split('@')[0] || 'Player'}
                  </p>
                  {entry.in_game_name && (
                    <p className="text-[10px] text-muted-foreground">{entry.email}</p>
                  )}
                </div>
                <p className="hidden md:block text-center text-sm text-muted-foreground">{entry.total_matches}</p>
                <div className="hidden md:flex justify-center">
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="h-3 w-3" /> {entry.wins}
                  </Badge>
                </div>
                <p className="text-right font-display font-bold text-success text-sm">₹{entry.total_earnings}</p>

                {/* Mobile extra info */}
                <div className="col-span-3 md:hidden flex gap-3 text-xs text-muted-foreground">
                  <span>{entry.total_matches} matches</span>
                  <span>{entry.wins} wins</span>
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

export default LeaderboardPage;
