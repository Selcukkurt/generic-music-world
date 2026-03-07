-- M04 RB-018: Personnel schema per spec
-- Alters personnel, job_titles; creates event_assignments

-- ============================================================
-- 1. Alter personnel table
-- ============================================================

-- Add columns (IF NOT EXISTS for idempotency)
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'freelance'));
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(12,2);
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS rbac_role TEXT DEFAULT 'staff';
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES public.job_titles(id) ON DELETE SET NULL;
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL;
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklist'));
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate full_name to first_name/last_name if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personnel' AND column_name = 'full_name') THEN
    UPDATE public.personnel SET
      first_name = COALESCE(NULLIF(trim(split_part(COALESCE(full_name, ''), ' ', 1)), ''), 'Unknown'),
      last_name = CASE WHEN strpos(COALESCE(full_name, ''), ' ') > 0 THEN trim(substring(full_name from strpos(full_name, ' ') + 1)) ELSE NULL END
    WHERE first_name IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_personnel_status ON public.personnel(status);
CREATE INDEX IF NOT EXISTS idx_personnel_job_title ON public.personnel(job_title_id);
CREATE INDEX IF NOT EXISTS idx_personnel_org_unit ON public.personnel(org_unit_id);

-- ============================================================
-- 2. Alter job_titles (add description, rbac_level, org_unit_id)
-- ============================================================

ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS rbac_level INT DEFAULT 0;
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL;

-- Keep 'name' as title display; add title alias if needed
-- job_titles.name already exists

-- ============================================================
-- 3. event_assignments (event staff assignment)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  job_title_id UUID NOT NULL REFERENCES public.job_titles(id) ON DELETE RESTRICT,
  assignment_type TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'acting')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_assignments_personnel ON public.event_assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_event ON public.event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_job_title ON public.event_assignments(job_title_id);

DROP TRIGGER IF EXISTS event_assignments_updated_at ON public.event_assignments;
CREATE TRIGGER event_assignments_updated_at
  BEFORE UPDATE ON public.event_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage event_assignments" ON public.event_assignments;
CREATE POLICY "Admins manage event_assignments"
  ON public.event_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Leads and admins read event_assignments" ON public.event_assignments;
CREATE POLICY "Leads and admins read event_assignments"
  ON public.event_assignments FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));
