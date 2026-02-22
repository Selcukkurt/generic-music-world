-- Run this in Supabase SQL Editor if you cannot use `supabase db push`.
-- Copy and paste the entire file, then execute.

-- ============================================================
-- Migration 1: releases_deployments_rollbacks
-- ============================================================

-- Enums (ignore error if already exist)
DO $$ BEGIN
  CREATE TYPE release_status AS ENUM ('DRAFT', 'READY', 'DEPLOYED', 'ROLLED_BACK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE deploy_environment AS ENUM ('LOCAL', 'STAGING', 'PRODUCTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE deploy_status AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- releases
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id TEXT NOT NULL UNIQUE,
  version_tag TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  status release_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON public.releases(created_at DESC);

-- deployments
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_id TEXT NOT NULL UNIQUE,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  environment deploy_environment NOT NULL,
  commit_sha TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  status deploy_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_deployments_release ON public.deployments(release_id);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON public.deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON public.deployments(started_at DESC);

-- rollbacks
CREATE TABLE IF NOT EXISTS public.rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rollback_id TEXT NOT NULL UNIQUE,
  from_deploy_id UUID NOT NULL REFERENCES public.deployments(id),
  to_deploy_id UUID NOT NULL REFERENCES public.deployments(id),
  reason TEXT NOT NULL,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rollbacks_executed_at ON public.rollbacks(executed_at DESC);

-- RLS
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollbacks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Migration 2: RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can select releases" ON public.releases;
DROP POLICY IF EXISTS "Authenticated can insert releases" ON public.releases;
DROP POLICY IF EXISTS "Authenticated can update releases" ON public.releases;
CREATE POLICY "Authenticated can select releases" ON public.releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert releases" ON public.releases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update releases" ON public.releases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can select deployments" ON public.deployments;
DROP POLICY IF EXISTS "Authenticated can insert deployments" ON public.deployments;
CREATE POLICY "Authenticated can select deployments" ON public.deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deployments" ON public.deployments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can select rollbacks" ON public.rollbacks;
DROP POLICY IF EXISTS "Authenticated can insert rollbacks" ON public.rollbacks;
CREATE POLICY "Authenticated can select rollbacks" ON public.rollbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert rollbacks" ON public.rollbacks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Migration 3: audit_logs (Phase 1 MVP - Log Kayıtları)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN (
    'auth', 'db', 'settings', 'roles', 'releases', 'security', 'import_export', 'system'
  )),
  action TEXT NOT NULL,
  message TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_role TEXT,
  target_entity TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  metadata JSONB,
  request_ip TEXT,
  request_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System owner can select audit_logs" ON public.audit_logs;
CREATE POLICY "System owner can select audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'system_owner')
  );

DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- system_settings: system_owner can SELECT and UPDATE
DROP POLICY IF EXISTS "System owner can select system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "System owner can update system_settings" ON public.system_settings;

CREATE POLICY "System owner can select system_settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'system_owner')
  );

CREATE POLICY "System owner can update system_settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'system_owner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'system_owner')
  );

-- ============================================================
-- Migration 4: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
CREATE POLICY "Users can select own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Migration 5: approval_requests
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('system_owner', 'ceo', 'admin')
  );
$$;

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_type TEXT NOT NULL CHECK (request_type IN ('role_change', 'expense', 'access', 'contract', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  requester_seen BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status_created
  ON public.approval_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by_created
  ON public.approval_requests(requested_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester can select own approval_requests" ON public.approval_requests;
CREATE POLICY "Requester can select own approval_requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by);

DROP POLICY IF EXISTS "Admins can select all approval_requests" ON public.approval_requests;
CREATE POLICY "Admins can select all approval_requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Requester can insert own approval_requests" ON public.approval_requests;
CREATE POLICY "Requester can insert own approval_requests"
  ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

DROP POLICY IF EXISTS "Admins can update approval_requests" ON public.approval_requests;
CREATE POLICY "Admins can update approval_requests"
  ON public.approval_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- Migration 6: calendar_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'plan' CHECK (event_type IN ('plan', 'meeting', 'release', 'event', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON public.calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status_start ON public.calendar_events(status, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by_start ON public.calendar_events(created_by, start_at DESC);

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator can select own calendar_events" ON public.calendar_events;
CREATE POLICY "Creator can select own calendar_events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Team can select approved team events" ON public.calendar_events;
CREATE POLICY "Team can select approved team events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (visibility = 'team' AND status = 'approved');

DROP POLICY IF EXISTS "Admins can select all calendar_events" ON public.calendar_events;
CREATE POLICY "Admins can select all calendar_events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Creator can insert own calendar_events" ON public.calendar_events;
CREATE POLICY "Creator can insert own calendar_events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator or admin can update calendar_events" ON public.calendar_events;
CREATE POLICY "Creator or admin can update calendar_events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- ============================================================
-- Migration 7: task_boards + tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

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

CREATE INDEX IF NOT EXISTS idx_tasks_board_status_archived_order ON public.tasks(board_id, status, is_archived, order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_board_status_updated ON public.tasks(board_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_updated ON public.tasks(assignee_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_board_completed ON public.tasks(board_id, completed_at DESC);

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select task_boards" ON public.task_boards;
CREATE POLICY "Authenticated can select task_boards" ON public.task_boards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can select tasks" ON public.tasks;
CREATE POLICY "Authenticated can select tasks" ON public.tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Creator can insert own tasks" ON public.tasks;
CREATE POLICY "Creator can insert own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator assignee or admin can update tasks" ON public.tasks;
CREATE POLICY "Creator assignee or admin can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assignee_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR auth.uid() = assignee_id OR public.is_admin(auth.uid()));

INSERT INTO public.task_boards (id, name, description)
SELECT gen_random_uuid(), 'Genel Görevler', 'Ekip görevleri için varsayılan tahta'
WHERE NOT EXISTS (SELECT 1 FROM public.task_boards LIMIT 1);

-- ============================================================
-- Migration 8: profiles personnel columns + RLS
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'staff';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_lead_or_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('system_owner', 'ceo', 'admin', 'lead')
  );
$$;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Leads and admins can read all profiles" ON public.profiles;
CREATE POLICY "Leads and admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Leads and admins can update other profiles" ON public.profiles;
CREATE POLICY "Leads and admins can update other profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_lead_or_admin(auth.uid()))
  WITH CHECK (public.is_lead_or_admin(auth.uid()));

-- ============================================================
-- Migration 9: chat (threads, members, messages)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_group BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  last_message_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.chat_thread_members (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created ON public.chat_messages(sender_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.chat_update_last_message_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_last_message_at ON public.chat_messages;
CREATE TRIGGER chat_messages_last_message_at
  AFTER INSERT ON public.chat_messages FOR EACH ROW
  EXECUTE FUNCTION public.chat_update_last_message_at();

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can select chat_threads" ON public.chat_threads;
CREATE POLICY "Members can select chat_threads" ON public.chat_threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_thread_members WHERE thread_id = id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Creator can insert chat_threads" ON public.chat_threads;
CREATE POLICY "Creator can insert chat_threads" ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can select own thread memberships" ON public.chat_thread_members;
CREATE POLICY "Users can select own thread memberships" ON public.chat_thread_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Thread creator can add members" ON public.chat_thread_members;
CREATE POLICY "Thread creator can add members" ON public.chat_thread_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads WHERE id = thread_id AND created_by = auth.uid()));

DROP POLICY IF EXISTS "Thread members can select chat_messages" ON public.chat_messages;
CREATE POLICY "Thread members can select chat_messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_thread_members WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Thread members can insert chat_messages" ON public.chat_messages;
CREATE POLICY "Thread members can insert chat_messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chat_thread_members WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid())
  );

-- Enable Realtime: ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Profiles: allow authenticated to read active profiles for chat user picker
DROP POLICY IF EXISTS "Authenticated can read active profiles for chat" ON public.profiles;
CREATE POLICY "Authenticated can read active profiles for chat"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_active = true);

-- ============================================================
-- Migration 10: org_departments, org_teams, org_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.org_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  department_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS public.org_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  default_role TEXT NOT NULL DEFAULT 'staff',
  default_department_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
  default_team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  require_approval_for_role_change BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

DROP TRIGGER IF EXISTS org_settings_updated_at ON public.org_settings;
CREATE TRIGGER org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.org_settings (id, default_role)
VALUES (1, 'staff')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access org_departments" ON public.org_departments;
CREATE POLICY "Admins full access org_departments" ON public.org_departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access org_teams" ON public.org_teams;
CREATE POLICY "Admins full access org_teams" ON public.org_teams FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access org_settings" ON public.org_settings;
CREATE POLICY "Admins full access org_settings" ON public.org_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
