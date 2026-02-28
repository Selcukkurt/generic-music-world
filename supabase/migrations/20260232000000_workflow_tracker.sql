-- Live Workflow Tracker (M02)
-- workflow_steps, workflow_tasks

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.etkinlik_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'done', 'blocked'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_event_id ON public.workflow_steps(event_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_order ON public.workflow_steps(event_id, order_index);

DROP TRIGGER IF EXISTS workflow_steps_updated_at ON public.workflow_steps;
CREATE TRIGGER workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  owner TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_step_id ON public.workflow_tasks(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due_date ON public.workflow_tasks(due_date) WHERE due_date IS NOT NULL;

DROP TRIGGER IF EXISTS workflow_tasks_updated_at ON public.workflow_tasks;
CREATE TRIGGER workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select workflow_steps" ON public.workflow_steps;
DROP POLICY IF EXISTS "Authenticated can manage workflow_steps" ON public.workflow_steps;
CREATE POLICY "Authenticated can select workflow_steps"
  ON public.workflow_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage workflow_steps"
  ON public.workflow_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can select workflow_tasks" ON public.workflow_tasks;
DROP POLICY IF EXISTS "Authenticated can manage workflow_tasks" ON public.workflow_tasks;
CREATE POLICY "Authenticated can select workflow_tasks"
  ON public.workflow_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage workflow_tasks"
  ON public.workflow_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
