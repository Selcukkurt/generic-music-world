-- M04 360 Personnel Card: add profile fields for central HR view
-- nationality, hire_date

ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS hire_date DATE;

CREATE INDEX IF NOT EXISTS idx_personnel_hire_date ON public.personnel(hire_date);
