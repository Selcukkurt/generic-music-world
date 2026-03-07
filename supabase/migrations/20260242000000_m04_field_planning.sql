-- RB-018: Field & Planning Core - event_assignments status, payroll tables
-- Keeps Assignment layer separate from RBAC, Job Title, Personnel

-- ============================================================
-- 1. event_assignments: add status column
-- ============================================================
ALTER TABLE public.event_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'completed', 'cancelled'));
CREATE INDEX IF NOT EXISTS idx_event_assignments_status ON public.event_assignments(status);

-- ============================================================
-- 2. payroll_approvals (Hak Ediş Onayı)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  event_assignment_id UUID REFERENCES public.event_assignments(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'acting')),
  worked_days INT,
  period_start DATE,
  period_end DATE,
  compensation_type TEXT NOT NULL DEFAULT 'daily' CHECK (compensation_type IN ('daily', 'monthly', 'fixed')),
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_approvals_personnel ON public.payroll_approvals(personnel_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_event ON public.payroll_approvals(event_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_status ON public.payroll_approvals(approval_status);

DROP TRIGGER IF EXISTS payroll_approvals_updated_at ON public.payroll_approvals;
CREATE TRIGGER payroll_approvals_updated_at
  BEFORE UPDATE ON public.payroll_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payroll_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage payroll_approvals" ON public.payroll_approvals;
CREATE POLICY "Admins manage payroll_approvals"
  ON public.payroll_approvals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Leads and admins read payroll_approvals" ON public.payroll_approvals;
CREATE POLICY "Leads and admins read payroll_approvals"
  ON public.payroll_approvals FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

-- ============================================================
-- 3. payroll_transfer_queue (Finans Aktarım)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_transfer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_approval_id UUID NOT NULL REFERENCES public.payroll_approvals(id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  approved_amount DECIMAL(12, 2) NOT NULL,
  approval_date DATE NOT NULL,
  transfer_status TEXT NOT NULL DEFAULT 'ready' CHECK (transfer_status IN ('ready', 'transferred', 'failed')),
  reference TEXT,
  transferred_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_transfer_personnel ON public.payroll_transfer_queue(personnel_id);
CREATE INDEX IF NOT EXISTS idx_payroll_transfer_status ON public.payroll_transfer_queue(transfer_status);

DROP TRIGGER IF EXISTS payroll_transfer_queue_updated_at ON public.payroll_transfer_queue;
CREATE TRIGGER payroll_transfer_queue_updated_at
  BEFORE UPDATE ON public.payroll_transfer_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payroll_transfer_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage payroll_transfer_queue" ON public.payroll_transfer_queue;
CREATE POLICY "Admins manage payroll_transfer_queue"
  ON public.payroll_transfer_queue FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Leads and admins read payroll_transfer_queue" ON public.payroll_transfer_queue;
CREATE POLICY "Leads and admins read payroll_transfer_queue"
  ON public.payroll_transfer_queue FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));
