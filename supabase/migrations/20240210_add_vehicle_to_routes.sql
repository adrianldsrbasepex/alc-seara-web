-- Add vehicle_id to routes table to directly link route to vehicle
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
