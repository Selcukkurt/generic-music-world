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
