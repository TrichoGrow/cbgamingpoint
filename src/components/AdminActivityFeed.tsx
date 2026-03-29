import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle, Trophy, DollarSign, Gamepad2 } from 'lucide-react';

interface AdminLog {
  id: string;
  action: string;
  admin_id: string;
  created_at: string;
  details: any;
}

const ACTION_CONFIG: Record<string, { icon: typeof Activity; label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  approved_deposit: { icon: CheckCircle, label: 'Deposit Approved', variant: 'default' },
  rejected_deposit: { icon: XCircle, label: 'Deposit Rejected', variant: 'destructive' },
  approved_withdrawal: { icon: CheckCircle, label: 'Withdrawal Approved', variant: 'default' },
  rejected_withdrawal: { icon: XCircle, label: 'Withdrawal Rejected', variant: 'destructive' },
};

export default function AdminActivityFeed() {
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setLogs(data || []);
  };

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel('realtime-admin-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, (payload) => {
        setLogs(prev => [payload.new as AdminLog, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getConfig = (action: string) => ACTION_CONFIG[action] || { icon: Activity, label: action.replace(/_/g, ' '), variant: 'secondary' as const };

  const formatAmount = (details: any) => {
    if (!details?.amount) return '';
    return `₹${details.amount}`;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" /> Live Activity Feed
      </h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-3">
          {logs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>}
          {logs.map(log => {
            const config = getConfig(log.action);
            const Icon = config.icon;
            return (
              <div key={log.id} className="flex items-start gap-2 rounded-md border border-border/50 bg-background/50 p-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatAmount(log.details)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
