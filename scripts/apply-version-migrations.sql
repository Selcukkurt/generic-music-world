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
