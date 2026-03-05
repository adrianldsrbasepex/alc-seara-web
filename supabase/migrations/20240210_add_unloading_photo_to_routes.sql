-- Add unloading_photo_url column to routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS unloading_photo_url TEXT;
