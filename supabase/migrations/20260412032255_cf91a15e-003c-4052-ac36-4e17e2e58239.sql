INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true);

CREATE POLICY "Public read story media"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-media');

CREATE POLICY "Auth users upload story media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own story media"
ON storage.objects FOR DELETE
USING (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);