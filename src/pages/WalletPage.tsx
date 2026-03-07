import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeWallet } from '@/hooks/useRealtimeWallet';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, Copy, Upload, CheckCircle, Clock, XCircle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { toast } from 'sonner';

const MIN_DEPOSIT = 50;
const MIN_WITHDRAW = 100;

const WalletPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [upiId, setUpiId] = useState('Loading...');

  // Deposit form
  const [depositAmount, setDepositAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const refreshData = useCallback(() => { loadData(); }, [user]);
  useRealtimeWallet(user?.id, refreshData);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
    setBalance(profile?.wallet_balance || 0);

    const { data: deps } = await supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setDeposits(deps || []);

    const { data: withs } = await supabase.from('withdraw_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setWithdrawals(withs || []);

    const { data: txns } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setTransactions(txns || []);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(depositAmount);
    if (amount < MIN_DEPOSIT) { toast.error(`Minimum deposit is ₹${MIN_DEPOSIT}`); return; }
    if (!utrNumber.trim()) { toast.error('UTR number is required'); return; }
    if (!screenshot) { toast.error('Payment screenshot is required'); return; }
    if (screenshot.size > 5 * 1024 * 1024) { toast.error('Screenshot must be less than 5MB'); return; }

    setDepositLoading(true);
    try {
      // Check duplicate UTR
      const { data: existing } = await supabase.from('deposit_requests').select('id').eq('utr_number', utrNumber.trim()).maybeSingle();
      if (existing) { toast.error('This UTR number has already been used'); setDepositLoading(false); return; }

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const filePath = `deposits/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('screenshots').upload(filePath, screenshot);
      if (uploadError) throw uploadError;

      // Create deposit request
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user.id,
        amount,
        utr_number: utrNumber.trim(),
        payment_app: paymentApp.trim(),
        screenshot_path: filePath,
        status: 'pending',
      });
      if (error) throw error;

      toast.success('Deposit request submitted!');
      setDepositAmount('');
      setUtrNumber('');
      setPaymentApp('');
      setScreenshot(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit deposit');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(withdrawAmount);
    if (amount < MIN_WITHDRAW) { toast.error(`Minimum withdrawal is ₹${MIN_WITHDRAW}`); return; }
    if (amount > balance) { toast.error('Insufficient balance'); return; }
    if (!withdrawUpi.trim()) { toast.error('UPI ID is required'); return; }

    setWithdrawLoading(true);
    try {
      const { error } = await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        amount,
        upi_id: withdrawUpi.trim(),
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Withdrawal request submitted!');
      setWithdrawAmount('');
      setWithdrawUpi('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied!');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle }> = {
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return (
      <Badge variant={s.variant} className="gap-1 capitalize">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <div className="mb-6">
          <StatCard title="Wallet Balance" value={`₹${balance}`} icon={<WalletIcon className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="deposit" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="deposit" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowDownCircle className="h-4 w-4" /> Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowUpCircle className="h-4 w-4" /> Withdraw
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Payment Info */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <div className="rounded-lg bg-background p-4 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Send payment to UPI ID:</p>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-bold text-primary">{UPI_ID}</p>
                      <button onClick={copyUpi} className="text-muted-foreground hover:text-primary">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum deposit: ₹{MIN_DEPOSIT}</p>
                  <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Instructions:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                      <li>Send money to the UPI ID above</li>
                      <li>Note down the UTR number from your payment app</li>
                      <li>Fill the deposit form with amount, UTR & screenshot</li>
                      <li>Wait for admin approval</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Deposit Form */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">Submit Deposit</h3>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Amount (₹)</Label>
                    <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min={MIN_DEPOSIT} className="mt-1 bg-background" required />
                  </div>
                  <div>
                    <Label className="text-foreground">UTR Number *</Label>
                    <Input value={utrNumber} onChange={e => setUtrNumber(e.target.value)} className="mt-1 bg-background" placeholder="Enter UTR from payment app" required />
                  </div>
                  <div>
                    <Label className="text-foreground">Payment App</Label>
                    <Input value={paymentApp} onChange={e => setPaymentApp(e.target.value)} className="mt-1 bg-background" placeholder="e.g. Google Pay, PhonePe" />
                  </div>
                  <div>
                    <Label className="text-foreground">Payment Screenshot *</Label>
                    <div className="mt-1">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background p-4 hover:border-primary/40 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{screenshot ? screenshot.name : 'Upload screenshot (JPG/PNG, max 5MB)'}</span>
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => setScreenshot(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={depositLoading}>
                    {depositLoading ? 'Submitting...' : 'Submit Deposit Request'}
                  </Button>
                </form>
              </div>
            </div>

            {/* Deposit History */}
            <div className="mt-6 rounded-lg border border-border bg-card p-4">
              <h3 className="font-display font-bold text-foreground mb-3">Deposit History</h3>
              {deposits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deposits yet</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map(d => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">₹{d.amount}</p>
                        <p className="text-xs text-muted-foreground">UTR: {d.utr_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                      {statusBadge(d.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="max-w-md">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">Request Withdrawal</h3>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <Label className="text-foreground">UPI ID</Label>
                    <Input value={withdrawUpi} onChange={e => setWithdrawUpi(e.target.value)} className="mt-1 bg-background" placeholder="Enter your UPI ID" required />
                  </div>
                  <div>
                    <Label className="text-foreground">Amount (₹)</Label>
                    <Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min={MIN_WITHDRAW} className="mt-1 bg-background" required />
                    <p className="text-xs text-muted-foreground mt-1">Min: ₹{MIN_WITHDRAW} • Available: ₹{balance}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={withdrawLoading}>
                    {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </div>
            </div>

            {/* Withdraw History */}
            <div className="mt-6 rounded-lg border border-border bg-card p-4">
              <h3 className="font-display font-bold text-foreground mb-3">Withdrawal History</h3>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals yet</p>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">₹{w.amount}</p>
                        <p className="text-xs text-muted-foreground">UPI: {w.upi_id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      {statusBadge(w.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-display font-bold text-foreground mb-3">Transaction History</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-background p-3 border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t.type === 'deposit' || t.type === 'prize' ? '+' : '-'}₹{Math.abs(t.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{t.type} • {t.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-sm font-bold ${t.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                        {t.amount > 0 ? '+' : ''}₹{t.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WalletPage;
