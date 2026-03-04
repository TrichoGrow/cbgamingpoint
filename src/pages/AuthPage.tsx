import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gamepad2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast.success('Password reset email sent!');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-orange">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            CB <span className="text-primary glow-text">Gaming</span> Club
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create your gaming account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 glow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-background border-border"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-background border-border"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary hover:underline">
                  Sign up
                </button>
              </>
            ) : mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <button onClick={() => setMode('login')} className="inline-flex items-center gap-1 text-primary hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
