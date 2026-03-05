-- Add km_final_seara to routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS km_final_seara DECIMAL(10, 2);
