-- Add route_number field to routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_number TEXT;
