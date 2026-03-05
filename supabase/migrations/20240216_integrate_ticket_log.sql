-- Add consumption tracking to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS average_consumption DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_odometer DECIMAL(10, 2) DEFAULT 0.00;

-- Add Ticket Log identifier to expenses for idempotency
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ticket_log_id TEXT UNIQUE;
