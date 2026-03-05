-- Drivers (extending auth.users or standalone for this mock migration)
-- Since we are migrating from a mock app without real auth yet, we'll create a standalone drivers table
-- that can later be linked to auth.users.

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    license_plate TEXT,
    vehicle_model TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vehicles (Fleet)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    status TEXT DEFAULT 'Disponível', -- 'Em Rota', 'Completa Carga', 'Disponível', 'Pernoite', 'Manutenção'
    daily_rate DECIMAL(10, 2) DEFAULT 0.00,
    km_rate DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    date DATE NOT NULL,
    final_date DATE,
    status TEXT NOT NULL, -- 'Pendente', 'Em Andamento', 'Pernoite', 'Finalizada', 'Problema'
    cargo_type TEXT,
    estimated_revenue DECIMAL(10, 2),
    initial_km DECIMAL(10, 2),
    final_km DECIMAL(10, 2),
    km_final_seara DECIMAL(10, 2),
    route_number TEXT, -- Used for Ravex identification
    unloading_photo_url TEXT,
    leftover_photo_url TEXT,
    description TEXT,
    shunter_id UUID REFERENCES drivers(id),
    shunter_body_photo_url TEXT,
    shunter_boxes_photo_url TEXT,
    shunter_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES routes(id),
    driver_id UUID REFERENCES drivers(id),
    type TEXT NOT NULL, -- 'Combustível', 'Pedágio', 'Alimentação', 'Manutenção', 'Outros'
    amount DECIMAL(10, 2) NOT NULL,
    liters DECIMAL(10, 2), -- For fuel consumption calculation
    date DATE NOT NULL,
    notes TEXT,
    img_url TEXT, -- For receipts/canhotos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payment Requests
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id),
    type TEXT NOT NULL, -- 'Adiantamento', 'Reembolso'
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Aguardando', -- 'Aguardando', 'Aprovado', 'Pago', 'Recusado'
    description TEXT,
    metodo_pagamento TEXT, -- 'PIX', 'OxPay', 'Dinheiro', 'Outro'
    comprovante_url TEXT, -- base64 data URL or file URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Create policies (Open for now as per "anon" role usage in simple migration)
-- In production, strict policies based on auth.uid() should be applied.
DROP POLICY IF EXISTS "Enable read access for all users" ON drivers;
CREATE POLICY "Enable read access for all users" ON drivers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON drivers;
CREATE POLICY "Enable insert access for all users" ON drivers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON drivers;
CREATE POLICY "Enable update access for all users" ON drivers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON vehicles;
CREATE POLICY "Enable read access for all users" ON vehicles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON vehicles;
CREATE POLICY "Enable insert access for all users" ON vehicles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON vehicles;
CREATE POLICY "Enable update access for all users" ON vehicles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON routes;
CREATE POLICY "Enable read access for all users" ON routes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON routes;
CREATE POLICY "Enable insert access for all users" ON routes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON routes;
CREATE POLICY "Enable update access for all users" ON routes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON expenses;
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON expenses;
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON payment_requests;
CREATE POLICY "Enable read access for all users" ON payment_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON payment_requests;
CREATE POLICY "Enable insert access for all users" ON payment_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON payment_requests;
CREATE POLICY "Enable update access for all users" ON payment_requests FOR UPDATE USING (true);


-- Ravex Automation Results
CREATE TABLE IF NOT EXISTS ravex_automation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_number TEXT UNIQUE NOT NULL,
    additional_costs_count INTEGER DEFAULT 0,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    raw_data JSONB,
    status TEXT DEFAULT 'pending'
);

ALTER TABLE ravex_automation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON ravex_automation_results;
CREATE POLICY "Enable read access for all users" ON ravex_automation_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON ravex_automation_results;
CREATE POLICY "Enable insert access for all users" ON ravex_automation_results FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON ravex_automation_results;
CREATE POLICY "Enable update access for all users" ON ravex_automation_results FOR UPDATE USING (true);
