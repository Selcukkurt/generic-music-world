-- Organization structure: org_units, job_titles, person_assignments
-- Separates organizational hierarchy from RBAC (system access)
-- person_id references profiles (auth.users) for people with login; can support external later

-- ============================================================
-- 1. org_units
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
  module_code TEXT,
  level INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_units_parent ON public.org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_units_module ON public.org_units(module_code);
CREATE INDEX IF NOT EXISTS idx_org_units_active ON public.org_units(active);

DROP TRIGGER IF EXISTS org_units_updated_at ON public.org_units;
CREATE TRIGGER org_units_updated_at
  BEFORE UPDATE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. job_titles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  rank_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_titles_category ON public.job_titles(category);
CREATE INDEX IF NOT EXISTS idx_job_titles_rank ON public.job_titles(rank_order);

DROP TRIGGER IF EXISTS job_titles_updated_at ON public.job_titles;
CREATE TRIGGER job_titles_updated_at
  BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. person_assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.person_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_unit_id UUID NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  job_title_id UUID NOT NULL REFERENCES public.job_titles(id) ON DELETE RESTRICT,
  reports_to_person_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (assignment_type IN ('full_time', 'part_time', 'contractor', 'volunteer')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_assignments_person ON public.person_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_person_assignments_org_unit ON public.person_assignments(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_person_assignments_job_title ON public.person_assignments(job_title_id);
CREATE INDEX IF NOT EXISTS idx_person_assignments_reports_to ON public.person_assignments(reports_to_person_id);
CREATE INDEX IF NOT EXISTS idx_person_assignments_active ON public.person_assignments(active);

DROP TRIGGER IF EXISTS person_assignments_updated_at ON public.person_assignments;
CREATE TRIGGER person_assignments_updated_at
  BEFORE UPDATE ON public.person_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org_units"
  ON public.org_units FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read org_units"
  ON public.org_units FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admins manage job_titles"
  ON public.job_titles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read job_titles"
  ON public.job_titles FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admins manage person_assignments"
  ON public.person_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Leads and admins read person_assignments"
  ON public.person_assignments FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

CREATE POLICY "Users read own person_assignments"
  ON public.person_assignments FOR SELECT TO authenticated
  USING (person_id = auth.uid());

-- ============================================================
-- 5. SEED: GMW hierarchy (demo)
-- ============================================================

-- org_units: top-level structure
INSERT INTO public.org_units (id, name, parent_id, module_code, level, active) VALUES
  ('a0000001-0001-0001-0001-000000000001'::uuid, 'GMW Executive', NULL, NULL, 0, true),
  ('a0000002-0002-0002-0002-000000000002'::uuid, 'Operations', NULL, 'M02', 1, true),
  ('a0000003-0003-0003-0003-000000000003'::uuid, 'Finance', NULL, 'M03', 1, true),
  ('a0000004-0004-0004-0004-000000000004'::uuid, 'Marketing', NULL, 'M05', 1, true),
  ('a0000005-0005-0005-0005-000000000005'::uuid, 'Booking / Artist', NULL, 'M12', 1, true),
  ('a0000006-0006-0006-0006-000000000006'::uuid, 'HR / Organization', NULL, 'M04', 1, true)
ON CONFLICT (id) DO NOTHING;

-- job_titles
INSERT INTO public.job_titles (id, name, category, rank_order, active) VALUES
  ('b0000001-0001-0001-0001-000000000001'::uuid, 'Founder/CEO', 'executive', 100, true),
  ('b0000002-0002-0002-0002-000000000002'::uuid, 'COO', 'executive', 90, true),
  ('b0000003-0003-0003-0003-000000000003'::uuid, 'Event Director', 'operations', 80, true),
  ('b0000004-0004-0004-0004-000000000004'::uuid, 'Finance Director', 'finance', 80, true),
  ('b0000005-0005-0005-0005-000000000005'::uuid, 'Marketing Director', 'marketing', 80, true),
  ('b0000006-0006-0006-0006-000000000006'::uuid, 'Booking Director', 'artist', 80, true),
  ('b0000007-0007-0007-0007-000000000007'::uuid, 'HR / Organization', 'hr', 80, true),
  ('b0000008-0008-0008-0008-000000000008'::uuid, 'Operations Manager', 'operations', 70, true),
  ('b0000009-0009-0009-0009-000000000009'::uuid, 'Hostess', 'operations', 50, true),
  ('b0000010-0010-0010-0010-000000000010'::uuid, 'Cashier', 'operations', 50, true),
  ('b0000011-0011-0011-0011-000000000011'::uuid, 'Bar Staff', 'operations', 50, true)
ON CONFLICT (id) DO NOTHING;

-- person_assignments: assign system_owner to Founder/CEO in GMW Executive (if profiles exist)
INSERT INTO public.person_assignments (person_id, org_unit_id, job_title_id, is_primary, assignment_type, active)
SELECT p.id, ou.id, jt.id, true, 'full_time', true
FROM public.profiles p
JOIN public.org_units ou ON ou.name = 'GMW Executive'
JOIN public.job_titles jt ON jt.name = 'Founder/CEO'
WHERE p.role = 'system_owner'
  AND NOT EXISTS (SELECT 1 FROM public.person_assignments pa WHERE pa.person_id = p.id AND pa.is_primary);
