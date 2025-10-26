-- Create promo-images storage bucket for promo card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-images', 'promo-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to promo images
CREATE POLICY "Public read access to promo images"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-images');

-- Allow authenticated users to upload promo images
CREATE POLICY "Authenticated users can upload promo images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'promo-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update promo images
CREATE POLICY "Authenticated users can update promo images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'promo-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete promo images
CREATE POLICY "Authenticated users can delete promo images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'promo-images' AND
  auth.role() = 'authenticated'
);
