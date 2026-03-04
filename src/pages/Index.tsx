import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Gamepad2, Trophy, Wallet, Shield, Zap, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 glow-orange animate-float">
            <Gamepad2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-6xl lg:text-7xl">
            CB <span className="text-primary glow-text">Gaming</span> Club
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Join competitive esports tournaments. Win real prizes. Dominate the leaderboard.
          </p>
          <div className="mt-8 flex gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button variant="neon" size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=signup">
                  <Button variant="neon" size="lg">Join Now</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg">Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold text-foreground md:text-3xl">
          Why <span className="text-primary">CB Gaming</span>?
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Trophy, title: 'Tournaments', desc: 'Daily competitive tournaments across multiple games with real prize pools.' },
            { icon: Wallet, title: 'Instant Wallet', desc: 'Deposit & withdraw seamlessly. Screenshot + UTR based verification.' },
            { icon: Shield, title: 'Fair Play', desc: 'Admin-verified results. Anti-cheat measures. Transparent leaderboards.' },
          ].map(f => (
            <div key={f.title} className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:glow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:glow-orange transition-all">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 CB Gaming Club. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
