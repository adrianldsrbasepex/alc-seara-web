-- Add password column to shunters table
ALTER TABLE shunters ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing shunters with a default password (they should change it later)
UPDATE shunters SET password = 'Manobrista123!' WHERE password IS NULL;

-- Make password NOT NULL after setting defaults
ALTER TABLE shunters ALTER COLUMN password SET NOT NULL;
