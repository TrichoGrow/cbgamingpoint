-- Add profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS in_game_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favourite_game text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Enable realtime for tournaments and profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;