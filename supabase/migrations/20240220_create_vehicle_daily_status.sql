-- Create vehicle_daily_status table
CREATE TABLE IF NOT EXISTS vehicle_daily_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- R=Em Rota, C=Completa Carga, D=Disponível, P=Pernoite, M=Manutenção, O=Oficina, F=Finalizada
    status_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vehicle_id, date)
);

-- Enable RLS
ALTER TABLE vehicle_daily_status ENABLE ROW LEVEL SECURITY;

-- Create policies (Open access matching project pattern)
DROP POLICY IF EXISTS "Enable read access for all users" ON vehicle_daily_status;
CREATE POLICY "Enable read access for all users" ON vehicle_daily_status FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON vehicle_daily_status;
CREATE POLICY "Enable insert access for all users" ON vehicle_daily_status FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON vehicle_daily_status;
CREATE POLICY "Enable update access for all users" ON vehicle_daily_status FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON vehicle_daily_status;
CREATE POLICY "Enable delete access for all users" ON vehicle_daily_status FOR DELETE USING (true);
