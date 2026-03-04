-- Event-scoped RBAC: organizations, event_access, event_organizations
-- Partner users (venues/promoters/vendors) see only events they are assigned to

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('venue', 'promoter', 'sponsor', 'vendor')),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_role TEXT NOT NULL DEFAULT 'member' CHECK (org_role IN ('owner', 'member')),
  PRIMARY KEY (org_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.event_organizations (
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('venue', 'promoter', 'sponsor', 'vendor')),
  PRIMARY KEY (event_id, org_id)
);

CREATE TABLE IF NOT EXISTS public.event_access (
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
  PRIMARY KEY (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_members_profile ON public.organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_organizations_event ON public.event_organizations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizations_org ON public.event_organizations(org_id);
CREATE INDEX IF NOT EXISTS idx_event_access_profile ON public.event_access(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_access_event ON public.event_access(event_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. HELPER: can_access_event
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_event(
  uid uuid,
  evt_id uuid,
  required_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner/Admin/Director/Manager can access all events (internal staff)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('system_owner', 'ceo', 'admin', 'lead', 'staff')
  )
  OR EXISTS (
    SELECT 1 FROM public.event_access ea
    WHERE ea.event_id = evt_id AND ea.profile_id = uid
      AND (required_level = 'view' OR ea.access_level = 'edit')
  );
$$;

-- ============================================================
-- 3. RLS: organizations, organization_members, event_organizations, event_access
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;

-- organizations: admins manage; members read own orgs
CREATE POLICY "Admins manage organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members read own organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = organizations.id AND om.profile_id = auth.uid()
    )
  );

-- organization_members: admins manage; users read own
CREATE POLICY "Admins manage organization_members"
  ON public.organization_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own organization_members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- event_organizations: admins manage; users read if they have event access
CREATE POLICY "Admins manage event_organizations"
  ON public.event_organizations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read event_organizations for accessible events"
  ON public.event_organizations FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_access: admins manage; users read own
CREATE POLICY "Admins manage event_access"
  ON public.event_access FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users read own event_access"
  ON public.event_access FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- 4. RLS: etkinlik_events (replace permissive SELECT)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can select etkinlik_events" ON public.etkinlik_events;

-- Owner/Admin/Director/Manager/Staff: full access
CREATE POLICY "Internal staff select all etkinlik_events"
  ON public.etkinlik_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('system_owner', 'ceo', 'admin', 'lead', 'staff')
    )
  );

-- Partners: only assigned events
CREATE POLICY "Partners select assigned etkinlik_events"
  ON public.etkinlik_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = etkinlik_events.id AND ea.profile_id = auth.uid()
    )
  );

-- ============================================================
-- 5. RLS: event-scoped child tables (event_revenues, etc.)
-- ============================================================

-- Helper policy expression: admin OR has event access
-- We drop old permissive policies and add event-scoped ones

-- event_revenues
DROP POLICY IF EXISTS "Authenticated can select event_revenues" ON public.event_revenues;
CREATE POLICY "Admins or event access select event_revenues"
  ON public.event_revenues FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_expenses
DROP POLICY IF EXISTS "Authenticated can select event_expenses" ON public.event_expenses;
CREATE POLICY "Admins or event access select event_expenses"
  ON public.event_expenses FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_incidents
DROP POLICY IF EXISTS "Authenticated can select event_incidents" ON public.event_incidents;
CREATE POLICY "Admins or event access select event_incidents"
  ON public.event_incidents FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_documents
DROP POLICY IF EXISTS "Authenticated can select event_documents" ON public.event_documents;
CREATE POLICY "Admins or event access select event_documents"
  ON public.event_documents FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_crew
DROP POLICY IF EXISTS "Authenticated can select event_crew" ON public.event_crew;
CREATE POLICY "Admins or event access select event_crew"
  ON public.event_crew FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_logistics
DROP POLICY IF EXISTS "Authenticated can select event_logistics" ON public.event_logistics;
CREATE POLICY "Admins or event access select event_logistics"
  ON public.event_logistics FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- accounting_event_ledger
DROP POLICY IF EXISTS "Authenticated can select accounting_event_ledger" ON public.accounting_event_ledger;
CREATE POLICY "Admins or event access select accounting_event_ledger"
  ON public.accounting_event_ledger FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_closure_snapshot
DROP POLICY IF EXISTS "Authenticated can select event_closure_snapshot" ON public.event_closure_snapshot;
CREATE POLICY "Admins or event access select event_closure_snapshot"
  ON public.event_closure_snapshot FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- event_tasks
DROP POLICY IF EXISTS "Authenticated can select event_tasks" ON public.event_tasks;
CREATE POLICY "Admins or event access select event_tasks"
  ON public.event_tasks FOR SELECT TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'view'));

-- For INSERT/UPDATE/DELETE on child tables: require edit access
-- Admins already have full access via "Admins can manage *" policies
-- We need to add partner edit policies for tables that allow it

-- event_revenues: admins + event edit
DROP POLICY IF EXISTS "Admins can manage event_revenues" ON public.event_revenues;
CREATE POLICY "Admins manage event_revenues"
  ON public.event_revenues FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_revenues"
  ON public.event_revenues FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_expenses
DROP POLICY IF EXISTS "Admins can manage event_expenses" ON public.event_expenses;
CREATE POLICY "Admins manage event_expenses"
  ON public.event_expenses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_expenses"
  ON public.event_expenses FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_incidents
DROP POLICY IF EXISTS "Admins can manage event_incidents" ON public.event_incidents;
CREATE POLICY "Admins manage event_incidents"
  ON public.event_incidents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_incidents"
  ON public.event_incidents FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_documents
DROP POLICY IF EXISTS "Admins can manage event_documents" ON public.event_documents;
CREATE POLICY "Admins manage event_documents"
  ON public.event_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_documents"
  ON public.event_documents FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_crew
DROP POLICY IF EXISTS "Admins can manage event_crew" ON public.event_crew;
CREATE POLICY "Admins manage event_crew"
  ON public.event_crew FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_crew"
  ON public.event_crew FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_logistics
DROP POLICY IF EXISTS "Admins can manage event_logistics" ON public.event_logistics;
CREATE POLICY "Admins manage event_logistics"
  ON public.event_logistics FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_logistics"
  ON public.event_logistics FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- accounting_event_ledger
DROP POLICY IF EXISTS "Admins can manage accounting_event_ledger" ON public.accounting_event_ledger;
CREATE POLICY "Admins manage accounting_event_ledger"
  ON public.accounting_event_ledger FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage accounting_event_ledger"
  ON public.accounting_event_ledger FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));

-- event_closure_snapshot (insert only for admins)
DROP POLICY IF EXISTS "Admins can insert event_closure_snapshot" ON public.event_closure_snapshot;
CREATE POLICY "Admins insert event_closure_snapshot"
  ON public.event_closure_snapshot FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- event_tasks
DROP POLICY IF EXISTS "Admins can manage event_tasks" ON public.event_tasks;
CREATE POLICY "Admins manage event_tasks"
  ON public.event_tasks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Event edit access manage event_tasks"
  ON public.event_tasks FOR ALL TO authenticated
  USING (public.can_access_event(auth.uid(), event_id, 'edit'))
  WITH CHECK (public.can_access_event(auth.uid(), event_id, 'edit'));
