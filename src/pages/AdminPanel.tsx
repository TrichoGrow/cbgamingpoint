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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Users, Trophy, DollarSign, Gamepad2, Clock, CheckCircle, XCircle, Plus, Trash2, Edit, Image, Shield, Settings, Medal, Wallet, Bell, Send, HeartPulse, CreditCard, Building2, QrCode, Phone
} from 'lucide-react';
import FloatingSupport from '@/components/FloatingSupport';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AdminActivityFeed from '@/components/AdminActivityFeed';
import TournamentParticipants from '@/components/TournamentParticipants';

// Setting keys
const SETTING_KEYS = {
  upi_id: 'upi_id',
  min_deposit: 'min_deposit',
  max_deposit: 'max_deposit',
  min_withdrawal: 'min_withdrawal',
  commission_percent: 'commission_percent',
  maintenance_mode: 'maintenance_mode',
  welcome_bonus: 'welcome_bonus',
  support_whatsapp: 'support_whatsapp',
  payment_instructions: 'payment_instructions',
  bank_name: 'bank_name',
  bank_account_number: 'bank_account_number',
  bank_ifsc: 'bank_ifsc',
  bank_holder_name: 'bank_holder_name',
  payment_qr_url: 'payment_qr_url',
};

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
  const [gameLogoFile, setGameLogoFile] = useState<File | null>(null);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);

  // Tournament form
  const [tournamentForm, setTournamentForm] = useState({
    title: '', game_id: '', entry_fee: '0', prize_pool: '0', total_slots: '10',
    start_time: '', room_id: '', room_password: '', status: 'upcoming',
  });
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);

  // All settings in one object
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);

  // Winner declaration
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedTournamentForWinner, setSelectedTournamentForWinner] = useState<any>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');

  // User wallet adjustment
  const [walletAdjustDialogOpen, setWalletAdjustDialogOpen] = useState(false);
  const [adjustUser, setAdjustUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Notifications
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifSending, setNotifSending] = useState(false);
  const [viewAdminParticipants, setViewAdminParticipants] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; timestamp: string; profiles: number } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keep-alive`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const data = await res.json();
      setHealthStatus(data);
    } catch {
      setHealthStatus({ ok: false, timestamp: new Date().toISOString(), profiles: 0 });
    }
    setHealthLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void loadAll();
    void fetchHealth();

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_requests' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdraw_requests' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => loadAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAll = async () => {
    if (!user) return;

    const [
      userCountRes, pendDepRes, pendWithRes, activeTourRes, revRes,
      gamesRes, tourRes, depRes, withRes, usersRes, settingsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('deposit_requests').select('id').eq('status', 'pending'),
      supabase.from('withdraw_requests').select('id').eq('status', 'pending'),
      supabase.from('tournaments').select('id').in('status', ['upcoming', 'live']),
      supabase.from('wallet_transactions').select('amount').eq('type', 'entry_fee'),
      supabase.from('games').select('*').order('name'),
      supabase.from('tournaments').select('*, games(name)').order('created_at', { ascending: false }),
      supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('app_settings').select('key, value'),
    ]);

    const errors = [
      userCountRes.error, pendDepRes.error, pendWithRes.error, activeTourRes.error,
      revRes.error, gamesRes.error, tourRes.error, depRes.error, withRes.error,
      usersRes.error, settingsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      toast.error(errors[0]?.message || 'Failed to load admin data');
    }

    const revenue = revRes.data?.reduce((s, t) => s + Math.abs(Number(t.amount)), 0) || 0;

    setStats({
      users: userCountRes.count || 0,
      revenue,
      activeTournaments: activeTourRes.data?.length || 0,
      pendingDeposits: pendDepRes.data?.length || 0,
      pendingWithdrawals: pendWithRes.data?.length || 0,
    });

    setGames(gamesRes.data || []);
    setTournaments(tourRes.data || []);
    setDeposits(depRes.data || []);
    setWithdrawals(withRes.data || []);
    setAllUsers(usersRes.data || []);

    // Build settings map
    const settingsMap: Record<string, string> = {};
    (settingsRes.data || []).forEach((s: any) => { settingsMap[s.key] = s.value; });
    setSettings(settingsMap);
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase.from('app_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) { toast.error(`Failed to save ${key}`); return false; }
    return true;
  };

  const saveAllSettings = async () => {
    setSettingsLoading(true);

    // Upload QR if file selected
    if (qrFile) {
      const ext = qrFile.name.split('.').pop();
      const path = `qr/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('game-logos').upload(path, qrFile);
      if (uploadError) { toast.error('Failed to upload QR'); setSettingsLoading(false); return; }
      const { data: urlData } = supabase.storage.from('game-logos').getPublicUrl(path);
      settings.payment_qr_url = urlData.publicUrl;
      setQrFile(null);
    }

    const keys = Object.keys(SETTING_KEYS) as (keyof typeof SETTING_KEYS)[];
    let success = true;
    for (const key of keys) {
      if (settings[key] !== undefined) {
        const ok = await saveSetting(key, settings[key]);
        if (!ok) success = false;
      }
    }

    if (success) toast.success('All settings saved!');
    void loadAll();
    setSettingsLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Game CRUD
  const openAddGame = () => {
    setEditingGame(null); setGameName(''); setGameType(''); setGameLogo(''); setGameLogoFile(null); setGameDialogOpen(true);
  };

  const openEditGame = (g: any) => {
    setEditingGame(g); setGameName(g.name); setGameType(g.game_type || ''); setGameLogo(g.logo_url || ''); setGameLogoFile(null); setGameDialogOpen(true);
  };

  const saveGame = async () => {
    if (!gameName.trim()) { toast.error('Game name required'); return; }
    let logoUrl = gameLogo.trim() || null;
    if (gameLogoFile) {
      const ext = gameLogoFile.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('game-logos').upload(path, gameLogoFile);
      if (uploadError) { toast.error('Failed to upload logo: ' + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('game-logos').getPublicUrl(path);
      logoUrl = urlData.publicUrl;
    }
    const payload = { name: gameName.trim(), game_type: gameType.trim() || null, logo_url: logoUrl };
    const { error } = editingGame
      ? await supabase.from('games').update(payload).eq('id', editingGame.id)
      : await supabase.from('games').insert({ ...payload, is_active: true });
    if (error) { toast.error(error.message || 'Failed to save game'); return; }
    toast.success(editingGame ? 'Game updated' : 'Game added');
    setGameDialogOpen(false);
    void loadAll();
  };

  const toggleGame = async (game: any) => {
    const { error } = await supabase.from('games').update({ is_active: !game.is_active }).eq('id', game.id);
    if (error) { toast.error(error.message); return; }
    toast.success(game.is_active ? 'Game deactivated' : 'Game activated');
    void loadAll();
  };

  const deleteGame = async (id: string) => {
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Game removed');
    void loadAll();
  };

  // Tournament CRUD
  const openAddTournament = () => {
    setEditingTournament(null);
    setTournamentForm({ title: '', game_id: '', entry_fee: '0', prize_pool: '0', total_slots: '10', start_time: '', room_id: '', room_password: '', status: 'upcoming' });
    setTournamentDialogOpen(true);
  };

  const openEditTournament = (t: any) => {
    setEditingTournament(t);
    setTournamentForm({
      title: t.title, game_id: t.game_id, entry_fee: String(t.entry_fee),
      prize_pool: String(t.prize_pool), total_slots: String(t.total_slots),
      start_time: t.start_time?.slice(0, 16) || '', room_id: t.room_id || '', room_password: t.room_password || '',
      status: t.status || 'upcoming',
    });
    setTournamentDialogOpen(true);
  };

  const saveTournament = async () => {
    if (!tournamentForm.title.trim() || !tournamentForm.game_id || !tournamentForm.start_time) {
      toast.error('Title, game and start time are required'); return;
    }
    const data = {
      title: tournamentForm.title.trim(), game_id: tournamentForm.game_id,
      entry_fee: Number(tournamentForm.entry_fee), prize_pool: Number(tournamentForm.prize_pool),
      total_slots: Number(tournamentForm.total_slots),
      start_time: new Date(tournamentForm.start_time).toISOString(),
      room_id: tournamentForm.room_id.trim() || null, room_password: tournamentForm.room_password.trim() || null,
      status: tournamentForm.status,
    };
    const { error } = editingTournament
      ? await supabase.from('tournaments').update(data).eq('id', editingTournament.id)
      : await supabase.from('tournaments').insert(data);
    if (error) { toast.error(error.message || 'Failed to save tournament'); return; }
    toast.success(editingTournament ? 'Tournament updated' : 'Tournament created');
    setTournamentDialogOpen(false);
    void loadAll();
  };

  const updateTournamentStatus = async (tournamentId: string, status: string) => {
    const { error } = await supabase.from('tournaments').update({ status }).eq('id', tournamentId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Tournament marked as ${status}`);
    void loadAll();
  };

  const deleteTournament = async (t: any) => {
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
    const { error } = await supabase.from('tournaments').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Tournament cancelled & refunds issued');
    void loadAll();
  };

  // Deposit/Withdraw approval
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
    await supabase.from('admin_logs').insert({ admin_id: user!.id, action: `${action}_deposit`, details: { deposit_id: dep.id, amount: dep.amount } });
    toast.success(`Deposit ${action}`);
    void loadAll();
  };

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
    await supabase.from('admin_logs').insert({ admin_id: user!.id, action: `${action}_withdrawal`, details: { withdraw_id: w.id, amount: w.amount } });
    toast.success(`Withdrawal ${action}`);
    void loadAll();
  };

  const getScreenshotUrl = async (path: string) => {
    const { data } = await supabase.storage.from('screenshots').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  // Winner declaration
  const openWinnerDialog = async (tournament: any) => {
    setSelectedTournamentForWinner(tournament);
    setPrizeAmount(String(tournament.prize_pool));
    setSelectedWinnerId('');
    const { data } = await supabase.from('participants').select('user_id').eq('tournament_id', tournament.id);
    const userIds = data?.map(p => p.user_id) || [];
    const { data: profiles } = await supabase.from('profiles').select('id, email, in_game_name').in('id', userIds);
    setTournamentParticipants(profiles || []);
    setWinnerDialogOpen(true);
  };

  const declareWinner = async () => {
    if (!selectedWinnerId || !selectedTournamentForWinner) { toast.error('Select a winner'); return; }
    const prize = Number(prizeAmount);
    if (prize <= 0) { toast.error('Enter valid prize amount'); return; }
    await supabase.from('participants').update({ placement: 1 }).eq('tournament_id', selectedTournamentForWinner.id).eq('user_id', selectedWinnerId);
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', selectedWinnerId).single();
    await supabase.from('profiles').update({ wallet_balance: (profile?.wallet_balance || 0) + prize }).eq('id', selectedWinnerId);
    await supabase.from('wallet_transactions').insert({
      user_id: selectedWinnerId, amount: prize, type: 'prize',
      description: `Prize for winning ${selectedTournamentForWinner.title}`, reference_id: selectedTournamentForWinner.id,
    });
    await supabase.from('tournaments').update({ status: 'completed' }).eq('id', selectedTournamentForWinner.id);
    await supabase.from('admin_logs').insert({
      admin_id: user!.id, action: 'declared_winner',
      details: { tournament_id: selectedTournamentForWinner.id, winner_id: selectedWinnerId, prize },
    });
    toast.success('Winner declared & prize credited!');
    setWinnerDialogOpen(false);
    void loadAll();
  };

  // User wallet adjustment
  const openWalletAdjust = (u: any) => { setAdjustUser(u); setAdjustAmount(''); setAdjustReason(''); setWalletAdjustDialogOpen(true); };

  const adjustWallet = async () => {
    if (!adjustUser) return;
    const amount = Number(adjustAmount);
    if (!amount) { toast.error('Enter valid amount'); return; }
    if (!adjustReason.trim()) { toast.error('Enter reason'); return; }
    const newBalance = Math.max(0, (adjustUser.wallet_balance || 0) + amount);
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', adjustUser.id);
    await supabase.from('wallet_transactions').insert({
      user_id: adjustUser.id, amount, type: amount > 0 ? 'admin_credit' : 'admin_debit', description: adjustReason.trim(),
    });
    await supabase.from('admin_logs').insert({
      admin_id: user!.id, action: 'wallet_adjustment',
      details: { target_user: adjustUser.id, amount, reason: adjustReason.trim() },
    });
    toast.success(`Wallet adjusted by ₹${amount}`);
    setWalletAdjustDialogOpen(false);
    void loadAll();
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) { toast.error('Title and message required'); return; }
    setNotifSending(true);
    if (notifTarget === 'all') {
      const { error } = await supabase.from('notifications').insert({ title: notifTitle.trim(), message: notifMessage.trim(), is_global: true });
      if (error) { toast.error(error.message); setNotifSending(false); return; }
    } else {
      const { error } = await supabase.from('notifications').insert({ title: notifTitle.trim(), message: notifMessage.trim(), user_id: notifTarget, is_global: false });
      if (error) { toast.error(error.message); setNotifSending(false); return; }
    }
    await supabase.from('admin_logs').insert({ admin_id: user!.id, action: 'sent_notification', details: { title: notifTitle.trim(), target: notifTarget } });
    toast.success('Notification sent!');
    setNotifTitle(''); setNotifMessage(''); setNotifTarget('all');
    setNotifSending(false);
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <Shield className="inline h-6 w-6 text-primary mr-2" />
          Admin Panel
        </h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
          <StatCard title="Users" value={stats.users} icon={<Users className="h-5 w-5" />} />
          <StatCard title="Revenue" value={`₹${stats.revenue}`} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Active" value={stats.activeTournaments} icon={<Trophy className="h-5 w-5" />} />
          <StatCard title="Deposits" value={stats.pendingDeposits} icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Withdrawals" value={stats.pendingWithdrawals} icon={<Clock className="h-5 w-5" />} />
        </div>

        {/* Health Status */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <HeartPulse className={`h-5 w-5 ${healthStatus?.ok ? 'text-green-500 animate-pulse' : 'text-destructive'}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Backend Health: {healthLoading ? 'Checking...' : healthStatus?.ok ? 'Online ✅' : 'Offline ❌'}
            </p>
            {healthStatus?.timestamp && (
              <p className="text-xs text-muted-foreground">
                Last ping: {new Date(healthStatus.timestamp).toLocaleString()} — {healthStatus.profiles} profiles
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={fetchHealth} disabled={healthLoading}>
            {healthLoading ? 'Pinging…' : 'Ping Now'}
          </Button>
        </div>

        {/* Maintenance Mode Banner */}
        {settings.maintenance_mode === 'true' && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
            <p className="text-sm font-semibold text-yellow-600">⚠️ Maintenance Mode is ON — Users see a maintenance message</p>
          </div>
        )}

        <div className="mb-6">
          <AdminActivityFeed />
        </div>

        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="deposits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Withdrawals</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tournaments</TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Games</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Users</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-3 w-3 mr-1" /> Settings
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="h-3 w-3 mr-1" /> Notify
            </TabsTrigger>
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
                        <Button variant="outline" size="sm" onClick={() => getScreenshotUrl(d.screenshot_path)}>
                          <Image className="h-4 w-4" />
                        </Button>
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
              <Button className="gap-2" onClick={openAddTournament}><Plus className="h-4 w-4" /> Create Tournament</Button>
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
                      <Select value={t.status} onValueChange={(value) => updateTournamentStatus(t.id, value)}>
                        <SelectTrigger className="h-8 w-[140px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => openEditTournament(t)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewAdminParticipants(t)}><Users className="h-4 w-4" /> Players</Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openWinnerDialog(t)}><Medal className="h-4 w-4" /> Winner</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteTournament(t)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={tournamentDialogOpen} onOpenChange={setTournamentDialogOpen}>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-foreground">{editingTournament ? 'Edit' : 'Create'} Tournament</DialogTitle>
                  <DialogDescription>Fill in the tournament details below.</DialogDescription>
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
                  <div>
                    <Label className="text-foreground">Status</Label>
                    <Select value={tournamentForm.status} onValueChange={v => setTournamentForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={saveTournament} className="w-full">{editingTournament ? 'Update' : 'Create'} Tournament</Button>
                </div>
              </DialogContent>
            </Dialog>
            {/* Winner Declaration Dialog */}
            <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-foreground">Declare Winner</DialogTitle>
                  <DialogDescription>Select the winner for {selectedTournamentForWinner?.title}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-foreground">Winner</Label>
                    <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select winner" /></SelectTrigger>
                      <SelectContent>
                        {tournamentParticipants.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.in_game_name || p.email || p.id.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Prize Amount (₹)</Label>
                    <Input type="number" value={prizeAmount} onChange={e => setPrizeAmount(e.target.value)} className="mt-1 bg-background" />
                  </div>
                  <Button onClick={declareWinner} className="w-full gap-2"><Medal className="h-4 w-4" /> Declare Winner & Credit Prize</Button>
                </div>
              </DialogContent>
            </Dialog>
            {viewAdminParticipants && (
              <TournamentParticipants
                tournamentId={viewAdminParticipants.id}
                tournamentTitle={viewAdminParticipants.title}
                open={!!viewAdminParticipants}
                onOpenChange={(open) => !open && setViewAdminParticipants(null)}
              />
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <div className="mb-4">
              <Button className="gap-2" onClick={openAddGame}><Plus className="h-4 w-4" /> Add Game</Button>
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
                    <Button size="sm" variant="outline" onClick={() => openEditGame(g)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteGame(g.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-foreground">{editingGame ? 'Edit' : 'Add'} Game</DialogTitle>
                  <DialogDescription>Enter the game details below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-foreground">Game Name</Label><Input value={gameName} onChange={e => setGameName(e.target.value)} className="mt-1 bg-background" /></div>
                  <div><Label className="text-foreground">Game Type</Label><Input value={gameType} onChange={e => setGameType(e.target.value)} className="mt-1 bg-background" placeholder="e.g. Battle Royale, FPS" /></div>
                  <div>
                    <Label className="text-foreground">Logo Image</Label>
                    <Input type="file" accept="image/*" onChange={e => setGameLogoFile(e.target.files?.[0] || null)} className="mt-1 bg-background" />
                    {gameLogo && !gameLogoFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={gameLogo} alt="Current logo" className="h-10 w-10 rounded-lg object-cover" />
                        <span className="text-xs text-muted-foreground">Current logo</span>
                      </div>
                    )}
                  </div>
                  <div><Label className="text-foreground">Or Logo URL</Label><Input value={gameLogo} onChange={e => setGameLogo(e.target.value)} className="mt-1 bg-background" placeholder="https://..." /></div>
                  <Button onClick={saveGame} className="w-full">{editingGame ? 'Update' : 'Add'} Game</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-3">
              {allUsers.map(u => (
                <div key={u.id} className="flex flex-wrap items-center justify-between rounded-lg border border-border bg-card p-4 gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{u.email || u.id.slice(0, 12)}</p>
                    <p className="text-xs text-muted-foreground">IGN: {u.in_game_name || 'N/A'} • Phone: {u.phone || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Balance: ₹{u.wallet_balance || 0} • Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={u.is_banned ? 'destructive' : 'secondary'}>{u.is_banned ? 'Banned' : 'Active'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => openWalletAdjust(u)} className="gap-1">
                      <Wallet className="h-3 w-3" /> Adjust
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id);
                      toast.success(u.is_banned ? 'User unbanned' : 'User banned');
                      loadAll();
                    }}>{u.is_banned ? 'Unban' : 'Ban'}</Button>
                  </div>
                </div>
              ))}
            </div>
            <Dialog open={walletAdjustDialogOpen} onOpenChange={setWalletAdjustDialogOpen}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-foreground">Adjust Wallet</DialogTitle>
                  <DialogDescription>Adjust wallet for {adjustUser?.email || adjustUser?.id?.slice(0, 8)} (Current: ₹{adjustUser?.wallet_balance || 0})</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-foreground">Amount (+ to add, - to deduct)</Label>
                    <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="mt-1 bg-background" placeholder="e.g. 100 or -50" />
                  </div>
                  <div>
                    <Label className="text-foreground">Reason</Label>
                    <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="mt-1 bg-background" placeholder="Reason for adjustment" />
                  </div>
                  <Button onClick={adjustWallet} className="w-full">Apply Adjustment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Settings Tab - Full */}
          <TabsContent value="settings">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Payment Settings */}
              <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment Settings
                </h3>
                <div>
                  <Label className="text-foreground">UPI ID</Label>
                  <Input value={settings.upi_id || ''} onChange={e => updateSetting('upi_id', e.target.value)} className="mt-1 bg-background" placeholder="yourname@upi" />
                  <p className="text-xs text-muted-foreground mt-1">Users send deposits to this UPI</p>
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-primary" /> Bank Account
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-foreground text-xs">Bank Name</Label>
                      <Input value={settings.bank_name || ''} onChange={e => updateSetting('bank_name', e.target.value)} className="mt-1 bg-background" placeholder="e.g. State Bank of India" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Account Number</Label>
                      <Input value={settings.bank_account_number || ''} onChange={e => updateSetting('bank_account_number', e.target.value)} className="mt-1 bg-background" placeholder="Account number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground text-xs">IFSC Code</Label>
                        <Input value={settings.bank_ifsc || ''} onChange={e => updateSetting('bank_ifsc', e.target.value)} className="mt-1 bg-background" placeholder="SBIN0001234" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Account Holder</Label>
                        <Input value={settings.bank_holder_name || ''} onChange={e => updateSetting('bank_holder_name', e.target.value)} className="mt-1 bg-background" placeholder="Name" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <QrCode className="h-4 w-4 text-primary" /> Payment QR Code
                  </h4>
                  <Input type="file" accept="image/*" onChange={e => setQrFile(e.target.files?.[0] || null)} className="bg-background" />
                  {settings.payment_qr_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={settings.payment_qr_url} alt="QR" className="h-20 w-20 rounded-lg object-contain border border-border" />
                      <span className="text-xs text-muted-foreground">Current QR</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-foreground">Payment Instructions</Label>
                  <Textarea value={settings.payment_instructions || ''} onChange={e => updateSetting('payment_instructions', e.target.value)} className="mt-1 bg-background" placeholder="Custom instructions shown to users during deposit..." rows={3} />
                </div>
              </div>

              {/* App Settings */}
              <div className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> App Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground text-xs">Min Deposit (₹)</Label>
                      <Input type="number" value={settings.min_deposit || '10'} onChange={e => updateSetting('min_deposit', e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Max Deposit (₹)</Label>
                      <Input type="number" value={settings.max_deposit || '10000'} onChange={e => updateSetting('max_deposit', e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Min Withdrawal (₹)</Label>
                      <Input type="number" value={settings.min_withdrawal || '100'} onChange={e => updateSetting('min_withdrawal', e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Commission %</Label>
                      <Input type="number" value={settings.commission_percent || '0'} onChange={e => updateSetting('commission_percent', e.target.value)} className="mt-1 bg-background" placeholder="e.g. 5" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-xs">Welcome Bonus (₹)</Label>
                    <Input type="number" value={settings.welcome_bonus || '0'} onChange={e => updateSetting('welcome_bonus', e.target.value)} className="mt-1 bg-background" placeholder="Amount credited to new users" />
                    <p className="text-xs text-muted-foreground mt-1">Set to 0 to disable</p>
                  </div>
                  <div>
                    <Label className="text-foreground text-xs flex items-center gap-2"><Phone className="h-3 w-3" /> Support WhatsApp Number</Label>
                    <Input value={settings.support_whatsapp || ''} onChange={e => updateSetting('support_whatsapp', e.target.value)} className="mt-1 bg-background" placeholder="+91 9319263747" />
                    <p className="text-xs text-muted-foreground mt-1">Floating support button will use this number</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                      <p className="text-xs text-muted-foreground">Show maintenance page to all users</p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode === 'true'}
                      onCheckedChange={(checked) => updateSetting('maintenance_mode', checked ? 'true' : 'false')}
                    />
                  </div>
                </div>

                <Button onClick={saveAllSettings} disabled={settingsLoading} className="w-full" size="lg">
                  {settingsLoading ? 'Saving...' : '💾 Save All Settings'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="max-w-md space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Send Notification
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Send To</Label>
                    <Select value={notifTarget} onValueChange={setNotifTarget}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="All Users" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users (Global)</SelectItem>
                        {allUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.email || u.in_game_name || u.id.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Title</Label>
                    <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="mt-1 bg-background" placeholder="Notification title" />
                  </div>
                  <div>
                    <Label className="text-foreground">Message</Label>
                    <Textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} className="mt-1 bg-background" placeholder="Notification message..." rows={3} />
                  </div>
                  <Button onClick={sendNotification} disabled={notifSending} className="w-full gap-2">
                    <Send className="h-4 w-4" /> {notifSending ? 'Sending...' : 'Send Notification'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FloatingSupport />
    </div>
  );
};

export default AdminPanel;
