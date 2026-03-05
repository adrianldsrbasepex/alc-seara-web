-- Add rate columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS km_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Update existing rows (optional, but good for consistency)
UPDATE vehicles SET daily_rate = 0.00 WHERE daily_rate IS NULL;
UPDATE vehicles SET km_rate = 0.00 WHERE km_rate IS NULL;
