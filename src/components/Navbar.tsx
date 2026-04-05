import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Home, Trophy, Wallet, Shield, LogOut, Menu, X, User, Award, Swords
} from 'lucide-react';
import { useState } from 'react';
import appIcon from '@/assets/appicon.png';

const WHATSAPP_NUMBER = '919319263747';

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/tournaments', label: 'Tournaments', icon: Trophy },
    { to: '/wallet', label: 'Wallet', icon: Wallet },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={appIcon} alt="CB Gaming Club" className="h-10 w-10 rounded-lg object-cover" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            CB <span className="text-primary">Gaming</span> Club
          </span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={isActive(item.to) ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="gap-2 text-success">
                <MessageCircle className="h-4 w-4" />
                Support
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        )}

        {!user && (
          <div className="hidden gap-2 md:flex">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-2 text-success">
                <MessageCircle className="h-4 w-4" />
                Support
              </Button>
            </a>
            <Link to="/auth">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        )}

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {user ? (
            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={isActive(item.to) ? 'default' : 'ghost'}
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start gap-2 text-success">
                  <MessageCircle className="h-4 w-4" />
                  Contact Support
                </Button>
              </a>
              <Button variant="ghost" onClick={() => { signOut(); setMobileOpen(false); }} className="w-full justify-start gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-success">
                  <MessageCircle className="h-4 w-4" />
                  Contact Support
                </Button>
              </a>
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link to="/auth?mode=signup" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
