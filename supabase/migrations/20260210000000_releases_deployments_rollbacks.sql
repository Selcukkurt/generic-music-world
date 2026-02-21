-- Release & Deployment management tables
-- Enums
CREATE TYPE release_status AS ENUM ('DRAFT', 'READY', 'DEPLOYED', 'ROLLED_BACK');
CREATE TYPE deploy_environment AS ENUM ('LOCAL', 'STAGING', 'PRODUCTION');
CREATE TYPE deploy_status AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');

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

-- No policies: service role bypasses RLS for API routes
