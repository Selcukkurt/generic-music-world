-- M04 HR: personnel table (HR records separate from RBAC)
-- Keeps RBAC role, job title, and assignment as 3 distinct layers

-- ============================================================
-- 1. personnel (HR record: national_id, IBAN, insurance, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  national_id TEXT,
  iban TEXT,
  insurance_status TEXT NOT NULL DEFAULT 'insured' CHECK (insurance_status IN ('insured', 'freelance')),
  compensation_type TEXT NOT NULL DEFAULT 'salary' CHECK (compensation_type IN ('salary', 'daily_rate')),
  salary_monthly DECIMAL(12,2),
  daily_rate DECIMAL(10,2),
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personnel_profile ON public.personnel(profile_id);
CREATE INDEX IF NOT EXISTS idx_personnel_email ON public.personnel(email);
CREATE INDEX IF NOT EXISTS idx_personnel_is_active ON public.personnel(is_active);

DROP TRIGGER IF EXISTS personnel_updated_at ON public.personnel;
CREATE TRIGGER personnel_updated_at
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. assignments (links personnel to org_unit + job_title)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  org_unit_id UUID NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  job_title_id UUID NOT NULL REFERENCES public.job_titles(id) ON DELETE RESTRICT,
  reports_to_personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (assignment_type IN ('full_time', 'part_time', 'contractor', 'volunteer')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_personnel ON public.assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_assignments_org_unit ON public.assignments(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_assignments_job_title ON public.assignments(job_title_id);
CREATE INDEX IF NOT EXISTS idx_assignments_reports_to ON public.assignments(reports_to_personnel_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON public.assignments(active);

DROP TRIGGER IF EXISTS assignments_updated_at ON public.assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. personnel_documents (optional: file references)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personnel_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  doc_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personnel_documents_personnel ON public.personnel_documents(personnel_id);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage personnel" ON public.personnel;
CREATE POLICY "Admins manage personnel"
  ON public.personnel FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Leads and admins read personnel" ON public.personnel;
CREATE POLICY "Leads and admins read personnel"
  ON public.personnel FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own personnel" ON public.personnel;
CREATE POLICY "Users read own personnel"
  ON public.personnel FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage assignments" ON public.assignments;
CREATE POLICY "Admins manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Leads and admins read assignments" ON public.assignments;
CREATE POLICY "Leads and admins read assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage personnel_documents" ON public.personnel_documents;
CREATE POLICY "Admins manage personnel_documents"
  ON public.personnel_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Leads and admins read personnel_documents" ON public.personnel_documents;
CREATE POLICY "Leads and admins read personnel_documents"
  ON public.personnel_documents FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));
