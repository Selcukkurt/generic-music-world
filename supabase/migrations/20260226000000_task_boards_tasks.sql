-- Task boards table
CREATE TABLE IF NOT EXISTS public.task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  board_id UUID NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_index INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tasks_board_status_archived_order
  ON public.tasks(board_id, status, is_archived, order_index);

CREATE INDEX IF NOT EXISTS idx_tasks_board_status_updated
  ON public.tasks(board_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_updated
  ON public.tasks(assignee_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_board_completed
  ON public.tasks(board_id, completed_at DESC);

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- task_boards: all authenticated can read
CREATE POLICY "Authenticated can select task_boards"
  ON public.task_boards FOR SELECT TO authenticated
  USING (true);

-- tasks: all authenticated can read
CREATE POLICY "Authenticated can select tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (true);

-- tasks: creator can insert own
CREATE POLICY "Creator can insert own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- tasks: creator, assignee, or admin can update
CREATE POLICY "Creator assignee or admin can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assignee_id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() = assignee_id
    OR public.is_admin(auth.uid())
  );

-- No DELETE for clients. Use soft-archive.

-- Default board (run once)
INSERT INTO public.task_boards (id, name, description)
SELECT gen_random_uuid(), 'Genel Görevler', 'Ekip görevleri için varsayılan tahta'
WHERE NOT EXISTS (SELECT 1 FROM public.task_boards LIMIT 1);
