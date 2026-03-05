-- Create shunters table
CREATE TABLE IF NOT EXISTS shunters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE shunters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON shunters FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON shunters FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON shunters FOR UPDATE USING (true);

-- Add shunter fields to routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shunter_id UUID REFERENCES shunters(id);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shunter_body_photo_url TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shunter_boxes_photo_url TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS shunter_verified_at TIMESTAMP WITH TIME ZONE;

-- Seed some shunters for testing
INSERT INTO shunters (name, email)
VALUES ('Manobrista Teste', 'manobrista@alcepereirafilho.com.br')
ON CONFLICT (email) DO NOTHING;
