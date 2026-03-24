-- RBAC Users: lifecycle (active / passive / archived) — no hard deletes
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_lifecycle_status_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_lifecycle_status_check
  CHECK (lifecycle_status IN ('active', 'passive', 'archived'));

CREATE INDEX IF NOT EXISTS idx_app_users_lifecycle_status ON public.app_users(lifecycle_status);

-- Backfill from legacy is_active
UPDATE public.app_users
SET lifecycle_status = CASE WHEN is_active IS FALSE THEN 'passive' ELSE 'active' END
WHERE lifecycle_status = 'active';

-- Keep is_active aligned: archived rows are not "active" for legacy filters
UPDATE public.app_users SET is_active = (lifecycle_status <> 'archived');
