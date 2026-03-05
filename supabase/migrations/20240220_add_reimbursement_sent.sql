-- Add reimbursement_sent column to routes and expenses tables
ALTER TABLE routes ADD COLUMN IF NOT EXISTS reimbursement_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_sent BOOLEAN DEFAULT FALSE;
