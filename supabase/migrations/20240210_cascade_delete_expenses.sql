-- Drop existing constraint
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_route_id_fkey;

-- Add new constraint with ON DELETE CASCADE
ALTER TABLE expenses
ADD CONSTRAINT expenses_route_id_fkey
FOREIGN KEY (route_id)
REFERENCES routes(id)
ON DELETE CASCADE;
