
INSERT INTO storage.buckets (id, name, public) VALUES ('game-logos', 'game-logos', true);

CREATE POLICY "Anyone can view game logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'game-logos');

CREATE POLICY "Admins can upload game logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'game-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete game logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'game-logos' AND public.has_role(auth.uid(), 'admin'::app_role));
