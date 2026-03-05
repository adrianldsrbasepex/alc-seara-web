-- Create table for aggregated closure data per route
CREATE TABLE IF NOT EXISTS spreadsheet_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_number TEXT NOT NULL,
    route_id UUID REFERENCES routes(id),
    vehicle_id UUID REFERENCES vehicles(id),
    status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Confirmado'
    reference_date DATE, -- Data de referência do fechamento
    
    -- Calculated/Imported values
    km_real DECIMAL(10, 2), -- from route (final - initial)
    km_seara DECIMAL(10, 2), -- manually input
    valor_km_seara DECIMAL(10, 2), -- calculated
    valor_km_perdido DECIMAL(10, 2), -- calculated
    descarga_total DECIMAL(10, 2), -- sum of valor_bruto from items
    valor_diaria DECIMAL(10, 2), -- from vehicle
    valor_total DECIMAL(10, 2), -- final calculated value
    payment_date DATE, -- from spreadsheet
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for individual spreadsheet items (raw lines)
CREATE TABLE IF NOT EXISTS spreadsheet_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closure_id UUID REFERENCES spreadsheet_closures(id) ON DELETE CASCADE,
    route_number TEXT,
    valor_bruto DECIMAL(10, 2),
    data_envio DATE,
    data_previsao DATE,
    raw_data JSONB, -- Store full row data for reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_spreadsheet_closures_route_number ON spreadsheet_closures(route_number);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_closures_route_id ON spreadsheet_closures(route_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_items_closure_id ON spreadsheet_items(closure_id);
