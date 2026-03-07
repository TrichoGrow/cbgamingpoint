import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users, Trophy, DollarSign, Gamepad2, Clock, CheckCircle, XCircle, Plus, Trash2, Edit, Eye, Shield, Image
} from 'lucide-react';
import { toast } from 'sonner';

const AdminPanel = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, revenue: 0, activeTournaments: 0, pendingDeposits: 0, pendingWithdrawals: 0 });
  const [games, setGames] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Game form
  const [gameName, setGameName] = useState('');
  const [gameType, setGameType] = useState('');
  const [gameLogo, setGameLogo] = useState('');
  const [editingGame, setEditingGame] = useState<any>(null);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);

  // Tournament form
  const [tournamentForm, setTournamentForm] = useState({
    title: '', game_id: '', entry_fee: '0', prize_pool: '0', total_slots: '10',
    start_time: '', room_id: '', room_password: '',
  });
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    // Stats
    const { count: userCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { data: pendDep } = await supabase.from('deposit_requests').select('id').eq('status', 'pending');
    const { data: pendWith } = await supabase.from('withdraw_requests').select('id').eq('status', 'pending');
    const { data: activeTour } = await supabase.from('tournaments').select('id').in('status', ['upcoming', 'live']);
    const { data: revData } = await supabase.from('wallet_transactions').select('amount').eq('type', 'entry_fee');
    const revenue = revData?.reduce((s, t) => s + Math.abs(Number(t.amount)), 0) || 0;

    setStats({
      users: userCount || 0,
      revenue,
      activeTournaments: activeTour?.length || 0,
      pendingDeposits: pendDep?.length || 0,
      pendingWithdrawals: pendWith?.length || 0,
    });

    // Games
    const { data: gamesData } = await supabase.from('games').select('*').order('name');
    setGames(gamesData || []);

    // Tournaments
    const { data: tourData } = await supabase.from('tournaments').select('*, games(name)').order('created_at', { ascending: false });
    setTournaments(tourData || []);

    // Deposits
    const { data: depData } = await supabase.from('deposit_requests').select('*, profiles(email:id)').order('created_at', { ascending: false });
    setDeposits(depData || []);

    // Withdrawals
    const { data: withData } = await supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
    setWithdrawals(withData || []);

    // Users
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(usersData || []);
  };

  // Game CRUD
  const saveGame = async () => {
    if (!gameName.trim()) { toast.error('Game name required'); return; }
    if (editingGame) {
      await supabase.from('games').update({ name: gameName, game_type: gameType, logo_url: gameLogo }).eq('id', editingGame.id);
      toast.success('Game updated');
    } else {
      await supabase.from('games').insert({ name: gameName, game_type: gameType, logo_url: gameLogo, is_active: true });
      toast.success('Game added');
    }
    setGameDialogOpen(false);
    setGameName(''); setGameType(''); setGameLogo(''); setEditingGame(null);
    loadAll();
  };

  const toggleGame = async (game: any) => {
    await supabase.from('games').update({ is_active: !game.is_active }).eq('id', game.id);
    toast.success(game.is_active ? 'Game deactivated' : 'Game activated');
    loadAll();
  };

  const deleteGame = async (id: string) => {
    await supabase.from('games').delete().eq('id', id);
    toast.success('Game removed');
    loadAll();
  };

  // Tournament CRUD
  const saveTournament = async () => {
    const data = {
      title: tournamentForm.title,
      game_id: tournamentForm.game_id,
      entry_fee: Number(tournamentForm.entry_fee),
      prize_pool: Number(tournamentForm.prize_pool),
      total_slots: Number(tournamentForm.total_slots),
      start_time: tournamentForm.start_time,
      room_id: tournamentForm.room_id || null,
      room_password: tournamentForm.room_password || null,
      status: 'upcoming',
    };

    if (editingTournament) {
      await supabase.from('tournaments').update(data).eq('id', editingTournament.id);
      toast.success('Tournament updated');
    } else {
      await supabase.from('tournaments').insert(data);
      toast.success('Tournament created');
    }
    setTournamentDialogOpen(false);
    setTournamentForm({ title: '', game_id: '', entry_fee: '0', prize_pool: '0', total_slots: '10', start_time: '', room_id: '', room_password: '' });
    setEditingTournament(null);
    loadAll();
  };

  const deleteTournament = async (t: any) => {
    // Refund all participants
    const { data: parts } = await supabase.from('participants').select('user_id').eq('tournament_id', t.id);
    if (parts && t.entry_fee > 0) {
      for (const p of parts) {
        const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', p.user_id).single();
        await supabase.from('profiles').update({ wallet_balance: (profile?.wallet_balance || 0) + t.entry_fee }).eq('id', p.user_id);
        await supabase.from('wallet_transactions').insert({
          user_id: p.user_id, amount: t.entry_fee, type: 'refund',
          description: `Refund for cancelled tournament: ${t.title}`, reference_id: t.id,
        });
      }
    }
    await supabase.from('participants').delete().eq('tournament_id', t.id);
    await supabase.from('tournaments').delete().eq('id', t.id);
    toast.success('Tournament cancelled & refunds issued');
    loadAll();
  };

  // Deposit approval
  const handleDeposit = async (dep: any, action: 'approved' | 'rejected') => {
    await supabase.from('deposit_requests').update({ status: action }).eq('id', dep.id);
    if (action === 'approved') {
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', dep.user_id).single();
      await supabase.from('profiles').update({ wallet_balance: (profile?.wallet_balance || 0) + dep.amount }).eq('id', dep.user_id);
      await supabase.from('wallet_transactions').insert({
        user_id: dep.user_id, amount: dep.amount, type: 'deposit',
        description: `Deposit approved (UTR: ${dep.utr_number})`, reference_id: dep.id,
      });
    }
    await supabase.from('admin_logs').insert({
      admin_id: user!.id, action: `${action}_deposit`, details: { deposit_id: dep.id, amount: dep.amount },
    });
    toast.success(`Deposit ${action}`);
    loadAll();
  };

  // Withdraw approval
  const handleWithdraw = async (w: any, action: 'approved' | 'rejected') => {
    await supabase.from('withdraw_requests').update({ status: action }).eq('id', w.id);
    if (action === 'approved') {
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', w.user_id).single();
      await supabase.from('profiles').update({ wallet_balance: Math.max(0, (profile?.wallet_balance || 0) - w.amount) }).eq('id', w.user_id);
      await supabase.from('wallet_transactions').insert({
        user_id: w.user_id, amount: -w.amount, type: 'withdrawal',
        description: `Withdrawal to ${w.upi_id}`, reference_id: w.id,
      });
    }
    await supabase.from('admin_logs').insert({
      admin_id: user!.id, action: `${action}_withdrawal`, details: { withdraw_id: w.id, amount: w.amount },
    });
    toast.success(`Withdrawal ${action}`);
    loadAll();
  };

  const getScreenshotUrl = (path: string) => {
    const { data } = supabase.storage.from('screenshots').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <Shield className="inline h-6 w-6 text-primary mr-2" />
          Admin Panel
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
          <StatCard title="Users" value={stats.users} icon={<Users className="h-5 w-5" />} />
          <StatCard title="Revenue" value={`₹${stats.revenue}`} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Active" value={stats.activeTournaments} icon={<Trophy className="h-5 w-5" />} />
          <StatCard title="Deposits" value={stats.pendingDeposits} icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Withdrawals" value={stats.pendingWithdrawals} icon={<Clock className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="deposits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Withdrawals</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tournaments</TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Games</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Users</TabsTrigger>
          </TabsList>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <div className="space-y-3">
              {deposits.length === 0 ? <p className="text-muted-foreground text-center p-8">No deposit requests</p> : deposits.map(d => (
                <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">₹{d.amount}</p>
                      <p className="text-xs text-muted-foreground">UTR: {d.utr_number}</p>
                      <p className="text-xs text-muted-foreground">App: {d.payment_app || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">User: {d.user_id?.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.screenshot_path && (
                        <a href={getScreenshotUrl(d.screenshot_path)} target="_blank" rel="noopener">
                          <Button variant="outline" size="sm"><Image className="h-4 w-4" /></Button>
                        </a>
                      )}
                      {d.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleDeposit(d, 'approved')} className="gap-1"><CheckCircle className="h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeposit(d, 'rejected')} className="gap-1"><XCircle className="h-4 w-4" /> Reject</Button>
                        </>
                      ) : (
                        <Badge variant={d.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{d.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <div className="space-y-3">
              {withdrawals.length === 0 ? <p className="text-muted-foreground text-center p-8">No withdrawal requests</p> : withdrawals.map(w => (
                <div key={w.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">₹{w.amount}</p>
                      <p className="text-xs text-muted-foreground">UPI: {w.upi_id}</p>
                      <p className="text-xs text-muted-foreground">User: {w.user_id?.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {w.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleWithdraw(w, 'approved')} className="gap-1"><CheckCircle className="h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleWithdraw(w, 'rejected')} className="gap-1"><XCircle className="h-4 w-4" /> Reject</Button>
                        </>
                      ) : (
                        <Badge variant={w.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{w.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments">
            <div className="mb-4">
              <Dialog open={tournamentDialogOpen} onOpenChange={setTournamentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => { setEditingTournament(null); setTournamentForm({ title: '', game_id: '', entry_fee: '0', prize_pool: '0', total_slots: '10', start_time: '', room_id: '', room_password: '' }); }}>
                    <Plus className="h-4 w-4" /> Create Tournament
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-foreground">{editingTournament ? 'Edit' : 'Create'} Tournament</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label className="text-foreground">Title</Label><Input value={tournamentForm.title} onChange={e => setTournamentForm(f => ({ ...f, title: e.target.value }))} className="mt-1 bg-background" /></div>
                    <div><Label className="text-foreground">Game</Label>
                      <Select value={tournamentForm.game_id} onValueChange={v => setTournamentForm(f => ({ ...f, game_id: v }))}>
                        <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select game" /></SelectTrigger>
                        <SelectContent>{games.filter(g => g.is_active).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-foreground">Entry Fee (₹)</Label><Input type="number" value={tournamentForm.entry_fee} onChange={e => setTournamentForm(f => ({ ...f, entry_fee: e.target.value }))} className="mt-1 bg-background" /></div>
                      <div><Label className="text-foreground">Prize Pool (₹)</Label><Input type="number" value={tournamentForm.prize_pool} onChange={e => setTournamentForm(f => ({ ...f, prize_pool: e.target.value }))} className="mt-1 bg-background" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-foreground">Total Slots</Label><Input type="number" value={tournamentForm.total_slots} onChange={e => setTournamentForm(f => ({ ...f, total_slots: e.target.value }))} className="mt-1 bg-background" /></div>
                      <div><Label className="text-foreground">Start Time</Label><Input type="datetime-local" value={tournamentForm.start_time} onChange={e => setTournamentForm(f => ({ ...f, start_time: e.target.value }))} className="mt-1 bg-background" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-foreground">Room ID</Label><Input value={tournamentForm.room_id} onChange={e => setTournamentForm(f => ({ ...f, room_id: e.target.value }))} className="mt-1 bg-background" placeholder="Set before match" /></div>
                      <div><Label className="text-foreground">Room Password</Label><Input value={tournamentForm.room_password} onChange={e => setTournamentForm(f => ({ ...f, room_password: e.target.value }))} className="mt-1 bg-background" /></div>
                    </div>
                    <Button onClick={saveTournament} className="w-full">{editingTournament ? 'Update' : 'Create'} Tournament</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {tournaments.map(t => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.games?.name} • ₹{t.entry_fee} entry • ₹{t.prize_pool} prize • {t.slots_filled || 0}/{t.total_slots} slots</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.start_time).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="capitalize">{t.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingTournament(t);
                        setTournamentForm({
                          title: t.title, game_id: t.game_id, entry_fee: String(t.entry_fee),
                          prize_pool: String(t.prize_pool), total_slots: String(t.total_slots),
                          start_time: t.start_time?.slice(0, 16) || '', room_id: t.room_id || '', room_password: t.room_password || '',
                        });
                        setTournamentDialogOpen(true);
                      }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteTournament(t)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <div className="mb-4">
              <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => { setEditingGame(null); setGameName(''); setGameType(''); setGameLogo(''); }}>
                    <Plus className="h-4 w-4" /> Add Game
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-foreground">{editingGame ? 'Edit' : 'Add'} Game</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label className="text-foreground">Game Name</Label><Input value={gameName} onChange={e => setGameName(e.target.value)} className="mt-1 bg-background" /></div>
                    <div><Label className="text-foreground">Game Type</Label><Input value={gameType} onChange={e => setGameType(e.target.value)} className="mt-1 bg-background" placeholder="e.g. Battle Royale, FPS" /></div>
                    <div><Label className="text-foreground">Logo URL</Label><Input value={gameLogo} onChange={e => setGameLogo(e.target.value)} className="mt-1 bg-background" placeholder="https://..." /></div>
                    <Button onClick={saveGame} className="w-full">{editingGame ? 'Update' : 'Add'} Game</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {games.map(g => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {g.logo_url && <img src={g.logo_url} alt={g.name} className="h-10 w-10 rounded-lg object-cover" />}
                    <div>
                      <p className="font-display font-bold text-foreground">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.game_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={g.is_active ? 'default' : 'secondary'}>{g.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toggleGame(g)}>{g.is_active ? 'Deactivate' : 'Activate'}</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingGame(g); setGameName(g.name); setGameType(g.game_type || ''); setGameLogo(g.logo_url || '');
                      setGameDialogOpen(true);
                    }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteGame(g.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-3">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div>
                    <p className="font-semibold text-foreground">{u.email || u.id.slice(0, 12)}</p>
                    <p className="text-xs text-muted-foreground">Balance: ₹{u.wallet_balance || 0}</p>
                    <p className="text-xs text-muted-foreground">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.is_banned ? 'destructive' : 'secondary'}>{u.is_banned ? 'Banned' : 'Active'}</Badge>
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id);
                      toast.success(u.is_banned ? 'User unbanned' : 'User banned');
                      loadAll();
                    }}>{u.is_banned ? 'Unban' : 'Ban'}</Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
