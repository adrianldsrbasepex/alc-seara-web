-- Database: u323034450_searaalc

CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    license_plate TEXT,
    vehicle_model TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    plate VARCHAR(255) UNIQUE NOT NULL,
    model TEXT NOT NULL,
    status TEXT DEFAULT 'Disponível', -- 'Em Rota', 'Completa Carga', 'Disponível', 'Pernoite', 'Manutenção'
    daily_rate DECIMAL(10, 2) DEFAULT 0.00,
    km_rate DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    driver_id VARCHAR(36),
    vehicle_id VARCHAR(36),
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
    shunter_id VARCHAR(36),
    shunter_body_photo_url TEXT,
    shunter_boxes_photo_url TEXT,
    shunter_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (shunter_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    route_id VARCHAR(36),
    driver_id VARCHAR(36),
    type TEXT NOT NULL, -- 'Combustível', 'Pedágio', 'Alimentação', 'Manutenção', 'Outros'
    amount DECIMAL(10, 2) NOT NULL,
    liters DECIMAL(10, 2), -- For fuel consumption calculation
    date DATE NOT NULL,
    notes TEXT,
    img_url TEXT, -- For receipts/canhotos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    driver_id VARCHAR(36),
    type TEXT NOT NULL, -- 'Adiantamento', 'Reembolso'
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Aguardando', -- 'Aguardando', 'Aprovado', 'Pago', 'Recusado'
    description TEXT,
    metodo_pagamento TEXT, -- 'PIX', 'OxPay', 'Dinheiro', 'Outro'
    comprovante_url TEXT, -- base64 data URL or file URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS ravex_automation_results (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    route_number VARCHAR(255) UNIQUE NOT NULL,
    additional_costs_count INTEGER DEFAULT 0,
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSON,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS financial_closures (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00,
    total_expenses DECIMAL(10, 2) DEFAULT 0.00,
    net_profit DECIMAL(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Fechado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shunters (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_daily_status (
    id VARCHAR(36) PRIMARY KEY,
    vehicle_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(1) NOT NULL, -- 'R', 'C', 'D', 'P', 'M', 'O', 'F'
    status_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vehicle_date (vehicle_id, date),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Leftover Cargo
CREATE TABLE IF NOT EXISTS leftover_cargo (
    id VARCHAR(36) PRIMARY KEY,
    route_id VARCHAR(36),
    driver_id VARCHAR(36),
    box_number INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Spreadsheet Closures
CREATE TABLE IF NOT EXISTS spreadsheet_closures (
    id VARCHAR(36) PRIMARY KEY,
    route_number TEXT NOT NULL,
    route_id VARCHAR(36),
    vehicle_id VARCHAR(36),
    status TEXT DEFAULT 'Pendente',
    reference_date DATE,
    km_real DECIMAL(10, 2),
    km_seara DECIMAL(10, 2),
    valor_km_seara DECIMAL(10, 2),
    valor_km_perdido DECIMAL(10, 2),
    descarga_total DECIMAL(10, 2),
    valor_diaria DECIMAL(10, 2),
    valor_total DECIMAL(10, 2),
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Spreadsheet Items
CREATE TABLE IF NOT EXISTS spreadsheet_items (
    id VARCHAR(36) PRIMARY KEY,
    closure_id VARCHAR(36),
    route_number TEXT,
    valor_bruto DECIMAL(10, 2),
    data_envio DATE,
    data_previsao DATE,
    raw_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (closure_id) REFERENCES spreadsheet_closures(id) ON DELETE CASCADE
);

-- Updates (applied via script, documented here)
-- ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS average_consumption DECIMAL(10, 2) DEFAULT 0.00;
-- ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_odometer DECIMAL(10, 2) DEFAULT 0.00;
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ticket_log_id VARCHAR(255) UNIQUE;
