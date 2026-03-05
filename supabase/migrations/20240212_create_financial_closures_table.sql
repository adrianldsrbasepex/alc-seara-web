-- Create financial_closures table
CREATE TABLE IF NOT EXISTS public.financial_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    date TIMESTAMPTZ NOT NULL,
    total_value DECIMAL(12, 2) NOT NULL,
    total_receivable DECIMAL(12, 2) NOT NULL,
    divergence DECIMAL(12, 2) NOT NULL,
    rows JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.financial_closures ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access to authenticated users (simplify for now, adjust as needed)
CREATE POLICY "Allow all access to authenticated users on financial_closures"
ON public.financial_closures
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
