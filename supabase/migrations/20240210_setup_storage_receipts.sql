-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone (including anon users) to upload receipts
CREATE POLICY "Allow anon uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow public read access to receipts (for admins to view)
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow anyone to delete receipts
CREATE POLICY "Allow anon deletes"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'receipts');
