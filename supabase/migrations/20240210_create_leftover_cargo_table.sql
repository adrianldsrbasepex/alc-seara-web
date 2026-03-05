-- Create table for leftover cargo (sobras)
CREATE TABLE IF NOT EXISTS leftover_cargo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id),
    box_number INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE leftover_cargo ENABLE ROW LEVEL SECURITY;

-- Create policies (Open for now as per existing pattern)
CREATE POLICY "Enable read access for all users" ON leftover_cargo FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON leftover_cargo FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON leftover_cargo FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON leftover_cargo FOR DELETE USING (true);
