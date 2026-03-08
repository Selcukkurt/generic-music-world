-- Add hire_date to personnel if missing (schema cache / migration sync)
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS hire_date DATE;
CREATE INDEX IF NOT EXISTS idx_personnel_hire_date ON public.personnel(hire_date);
