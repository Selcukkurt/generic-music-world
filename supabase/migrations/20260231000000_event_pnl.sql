-- P&L Workspace (Event Operations M02)
-- event_pnl: feasibility / profit & loss before creating events

CREATE TABLE IF NOT EXISTS public.event_pnl (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'in_review', 'approved', 'rejected', 'archived'
  )),
  event_id UUID REFERENCES public.etkinlik_events(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  revenue_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_pnl_status ON public.event_pnl(status);
CREATE INDEX IF NOT EXISTS idx_event_pnl_event_id ON public.event_pnl(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_pnl_updated_at ON public.event_pnl(updated_at DESC);

DROP TRIGGER IF EXISTS event_pnl_updated_at ON public.event_pnl;
CREATE TRIGGER event_pnl_updated_at
  BEFORE UPDATE ON public.event_pnl
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_pnl ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select event_pnl" ON public.event_pnl;
DROP POLICY IF EXISTS "Authenticated can insert event_pnl" ON public.event_pnl;
DROP POLICY IF EXISTS "Authenticated can update event_pnl" ON public.event_pnl;
CREATE POLICY "Authenticated can select event_pnl"
  ON public.event_pnl FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert event_pnl"
  ON public.event_pnl FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update event_pnl"
  ON public.event_pnl FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
