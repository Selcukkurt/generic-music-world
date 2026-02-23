-- Event Hub (Etkinlik Operasyonları M02)
-- etkinlik_events and related tables

-- ============================================================
-- Helper: set_updated_at (required by triggers below)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. etkinlik_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.etkinlik_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'TASLAK' CHECK (status IN (
    'TASLAK', 'PLANLAMA', 'CANLI', 'KAPANIS_HAZIRLIGI', 'KAPANDI'
  )),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_etkinlik_events_date ON public.etkinlik_events(date DESC);
CREATE INDEX IF NOT EXISTS idx_etkinlik_events_status ON public.etkinlik_events(status);
CREATE INDEX IF NOT EXISTS idx_etkinlik_events_created_at ON public.etkinlik_events(created_at DESC);

DROP TRIGGER IF EXISTS etkinlik_events_updated_at ON public.etkinlik_events;
CREATE TRIGGER etkinlik_events_updated_at
  BEFORE UPDATE ON public.etkinlik_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. event_revenues
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14, 2),
  document_url TEXT,
  accounting_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (accounting_status IN ('PENDING', 'POSTED', 'ERROR')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_revenues_event_id ON public.event_revenues(event_id);
CREATE INDEX IF NOT EXISTS idx_event_revenues_accounting_status ON public.event_revenues(accounting_status);

DROP TRIGGER IF EXISTS event_revenues_updated_at ON public.event_revenues;
CREATE TRIGGER event_revenues_updated_at
  BEFORE UPDATE ON public.event_revenues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. event_expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED')),
  document_url TEXT,
  accounting_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (accounting_status IN ('PENDING', 'POSTED', 'ERROR')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_expenses_event_id ON public.event_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_expenses_accounting_status ON public.event_expenses(accounting_status);

DROP TRIGGER IF EXISTS event_expenses_updated_at ON public.event_expenses;
CREATE TRIGGER event_expenses_updated_at
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. event_incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_incidents_event_id ON public.event_incidents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_incidents_status ON public.event_incidents(status);

DROP TRIGGER IF EXISTS event_incidents_updated_at ON public.event_incidents;
CREATE TRIGGER event_incidents_updated_at
  BEFORE UPDATE ON public.event_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. event_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON public.event_documents(event_id);

-- ============================================================
-- 6. event_crew
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_crew_event_id ON public.event_crew(event_id);

-- ============================================================
-- 7. event_logistics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_logistics_event_id ON public.event_logistics(event_id);

DROP TRIGGER IF EXISTS event_logistics_updated_at ON public.event_logistics;
CREATE TRIGGER event_logistics_updated_at
  BEFORE UPDATE ON public.event_logistics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. accounting_event_ledger (for E-Muhasebe M03)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounting_event_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_expense NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'POSTED', 'ERROR')),
  posted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_event_ledger_event_id ON public.accounting_event_ledger(event_id);

-- ============================================================
-- 9. event_closure_snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_closure_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  snapshot_json JSONB NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_event_closure_snapshot_event_id ON public.event_closure_snapshot(event_id);

-- ============================================================
-- 10. event_tasks (link table: tasks <-> events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON public.event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_task_id ON public.event_tasks(task_id);

-- ============================================================
-- Add event_id to tasks (optional FK) - nullable for backward compat
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.etkinlik_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.tasks(event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- Extend audit_logs category for events (if constraint exists)
-- ============================================================
-- Fix any rows with invalid category before altering constraint
-- (preserves rows by mapping to 'system'; avoids constraint violation)
UPDATE public.audit_logs
SET category = 'system'
WHERE category IS NULL
   OR category NOT IN (
     'auth', 'db', 'settings', 'roles', 'releases', 'security', 'import_export', 'system', 'events'
   );

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_category_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_category_check
  CHECK (category IN (
    'auth', 'db', 'settings', 'roles', 'releases', 'security', 'import_export', 'system', 'events'
  ));

-- ============================================================
-- Audit trigger for etkinlik_events status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_event_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      severity, category, action, message,
      target_entity, target_id, status, metadata
    ) VALUES (
      'info', 'events',
      'event_status_change',
      'Etkinlik durumu: ' || COALESCE(OLD.status, '') || ' -> ' || NEW.status,
      'etkinlik_events', NEW.id::text, 'success',
      jsonb_build_object(
        'event_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'event_name', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_event_status_change ON public.etkinlik_events;
CREATE TRIGGER audit_event_status_change
  AFTER UPDATE ON public.etkinlik_events
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_event_status_change();

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.etkinlik_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_event_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_closure_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;

-- etkinlik_events: authenticated can read; admins can write
DROP POLICY IF EXISTS "Authenticated can select etkinlik_events" ON public.etkinlik_events;
DROP POLICY IF EXISTS "Admins can insert etkinlik_events" ON public.etkinlik_events;
DROP POLICY IF EXISTS "Admins can update etkinlik_events" ON public.etkinlik_events;
CREATE POLICY "Authenticated can select etkinlik_events"
  ON public.etkinlik_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert etkinlik_events"
  ON public.etkinlik_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update etkinlik_events"
  ON public.etkinlik_events FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_revenues
DROP POLICY IF EXISTS "Authenticated can select event_revenues" ON public.event_revenues;
DROP POLICY IF EXISTS "Admins can manage event_revenues" ON public.event_revenues;
CREATE POLICY "Authenticated can select event_revenues"
  ON public.event_revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_revenues"
  ON public.event_revenues FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_expenses
DROP POLICY IF EXISTS "Authenticated can select event_expenses" ON public.event_expenses;
DROP POLICY IF EXISTS "Admins can manage event_expenses" ON public.event_expenses;
CREATE POLICY "Authenticated can select event_expenses"
  ON public.event_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_expenses"
  ON public.event_expenses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_incidents
DROP POLICY IF EXISTS "Authenticated can select event_incidents" ON public.event_incidents;
DROP POLICY IF EXISTS "Admins can manage event_incidents" ON public.event_incidents;
CREATE POLICY "Authenticated can select event_incidents"
  ON public.event_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_incidents"
  ON public.event_incidents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_documents
DROP POLICY IF EXISTS "Authenticated can select event_documents" ON public.event_documents;
DROP POLICY IF EXISTS "Admins can manage event_documents" ON public.event_documents;
CREATE POLICY "Authenticated can select event_documents"
  ON public.event_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_documents"
  ON public.event_documents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_crew
DROP POLICY IF EXISTS "Authenticated can select event_crew" ON public.event_crew;
DROP POLICY IF EXISTS "Admins can manage event_crew" ON public.event_crew;
CREATE POLICY "Authenticated can select event_crew"
  ON public.event_crew FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_crew"
  ON public.event_crew FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_logistics
DROP POLICY IF EXISTS "Authenticated can select event_logistics" ON public.event_logistics;
DROP POLICY IF EXISTS "Admins can manage event_logistics" ON public.event_logistics;
CREATE POLICY "Authenticated can select event_logistics"
  ON public.event_logistics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_logistics"
  ON public.event_logistics FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- accounting_event_ledger
DROP POLICY IF EXISTS "Authenticated can select accounting_event_ledger" ON public.accounting_event_ledger;
DROP POLICY IF EXISTS "Admins can manage accounting_event_ledger" ON public.accounting_event_ledger;
CREATE POLICY "Authenticated can select accounting_event_ledger"
  ON public.accounting_event_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage accounting_event_ledger"
  ON public.accounting_event_ledger FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- event_closure_snapshot
DROP POLICY IF EXISTS "Authenticated can select event_closure_snapshot" ON public.event_closure_snapshot;
DROP POLICY IF EXISTS "Admins can insert event_closure_snapshot" ON public.event_closure_snapshot;
CREATE POLICY "Authenticated can select event_closure_snapshot"
  ON public.event_closure_snapshot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert event_closure_snapshot"
  ON public.event_closure_snapshot FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- event_tasks
DROP POLICY IF EXISTS "Authenticated can select event_tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "Admins can manage event_tasks" ON public.event_tasks;
CREATE POLICY "Authenticated can select event_tasks"
  ON public.event_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_tasks"
  ON public.event_tasks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed: one sample event for testing (optional, run once)
INSERT INTO public.etkinlik_events (name, date, venue, status, description)
SELECT 'Örnek Etkinlik', CURRENT_DATE + 7, 'Örnek Mekan', 'PLANLAMA', 'Test için örnek etkinlik'
WHERE NOT EXISTS (SELECT 1 FROM public.etkinlik_events LIMIT 1);
