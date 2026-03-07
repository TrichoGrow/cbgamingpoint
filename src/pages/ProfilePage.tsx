import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Gamepad2, Mail, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    in_game_name: '',
    email: '',
    favourite_game: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadGames();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('email, in_game_name, favourite_game, phone, bio')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile({
        in_game_name: data.in_game_name || '',
        email: data.email || user.email || '',
        favourite_game: data.favourite_game || '',
        phone: data.phone || '',
        bio: data.bio || '',
      });
    }
    setLoading(false);
  };

  const loadGames = async () => {
    const { data } = await supabase.from('games').select('id, name').eq('is_active', true);
    setGames(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        in_game_name: profile.in_game_name || null,
        favourite_game: profile.favourite_game || null,
        phone: profile.phone || null,
        bio: profile.bio || null,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background bg-grid">
        <Navbar />
        <div className="flex justify-center p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />
      <div className="container py-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          <User className="inline h-6 w-6 text-primary mr-2" />
          My Profile
        </h1>

        <div className="max-w-lg">
          <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <Label className="text-foreground flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" /> In-Game Name
              </Label>
              <Input
                value={profile.in_game_name}
                onChange={e => setProfile(p => ({ ...p, in_game_name: e.target.value }))}
                className="mt-1 bg-background"
                placeholder="Your gaming alias"
              />
            </div>

            <div>
              <Label className="text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Email
              </Label>
              <Input
                value={profile.email}
                disabled
                className="mt-1 bg-background opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label className="text-foreground flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" /> Favourite Game
              </Label>
              <Select value={profile.favourite_game} onValueChange={v => setProfile(p => ({ ...p, favourite_game: v }))}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder="Select your favourite game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map(g => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Phone Number
              </Label>
              <Input
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="mt-1 bg-background"
                placeholder="+91 XXXXXXXXXX"
              />
            </div>

            <div>
              <Label className="text-foreground">Bio</Label>
              <Textarea
                value={profile.bio}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                className="mt-1 bg-background"
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
