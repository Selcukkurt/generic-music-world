-- RB-018: Strengthen personnel-org relationship
-- Preserves separation: RBAC role, Job title, Assignment

-- ============================================================
-- 1. personnel: add reports_to_person_id
-- ============================================================
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS reports_to_person_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_personnel_reports_to ON public.personnel(reports_to_person_id);

-- ============================================================
-- 2. job_titles: add rbac_role, reports_to_job_title_id
-- ============================================================
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS rbac_role TEXT;
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS reports_to_job_title_id UUID REFERENCES public.job_titles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_job_titles_reports_to ON public.job_titles(reports_to_job_title_id);

-- ============================================================
-- 3. org_units: add manager_id (optional head of unit)
-- ============================================================
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_org_units_manager ON public.org_units(manager_id);
