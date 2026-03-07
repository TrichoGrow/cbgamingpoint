import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in hash
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      toast.error('Invalid reset link');
      navigate('/auth');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); }
    else { toast.success('Password updated!'); navigate('/dashboard'); }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 glow-card">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-background" placeholder="••••••••" required minLength={6} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
