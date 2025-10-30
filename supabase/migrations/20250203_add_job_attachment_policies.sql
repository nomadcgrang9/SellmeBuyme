-- Ensure row level security is enabled for storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to job posting attachments
DROP POLICY IF EXISTS "Allow public read job attachments" ON storage.objects;
CREATE POLICY "Allow public read job attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-posting-attachments');

-- Allow authenticated users to upload job posting attachments
DROP POLICY IF EXISTS "Allow authenticated upload job attachments" ON storage.objects;
CREATE POLICY "Allow authenticated upload job attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-posting-attachments' AND
  auth.role() = 'authenticated'
);

-- Allow owners to update their own job posting attachments
DROP POLICY IF EXISTS "Allow owner update job attachments" ON storage.objects;
CREATE POLICY "Allow owner update job attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'job-posting-attachments' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'job-posting-attachments'
);

-- Allow owners to delete their own job posting attachments
DROP POLICY IF EXISTS "Allow owner delete job attachments" ON storage.objects;
CREATE POLICY "Allow owner delete job attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-posting-attachments' AND
  owner = auth.uid()
);
