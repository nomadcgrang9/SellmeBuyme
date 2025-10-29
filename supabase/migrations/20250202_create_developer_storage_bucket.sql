-- Create developer storage bucket for idea images
INSERT INTO storage.buckets (id, name, public)
VALUES ('developer', 'developer', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to developer images
CREATE POLICY "Public read access to developer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'developer');

-- Allow anyone (including anonymous) to upload idea images
CREATE POLICY "Anyone can upload developer images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'developer' AND
  (storage.foldername(name))[1] = 'ideas'  -- Only allow uploads to ideas/ folder
);

-- Allow anyone to update their uploaded images
CREATE POLICY "Anyone can update developer images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'developer' AND
  (storage.foldername(name))[1] = 'ideas'
);

-- Allow anyone to delete their uploaded images
CREATE POLICY "Anyone can delete developer images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'developer' AND
  (storage.foldername(name))[1] = 'ideas'
);
