-- Idempotent: ensure onboarding completion columns exist and add explicit status for access gates.
-- Fixes environments where onboarding_completed_at was never migrated.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.app_users.onboarding_completed_at IS
  'When mandatory compliance onboarding finished (before activation).';

COMMENT ON COLUMN public.app_users.onboarding_status IS
  'pending | completed — product gate until compliance onboarding is finalized.';

UPDATE public.app_users
SET onboarding_status = 'completed'
WHERE onboarding_completed_at IS NOT NULL
  AND (onboarding_status IS DISTINCT FROM 'completed');

UPDATE public.app_users
SET onboarding_status = 'pending'
WHERE onboarding_completed_at IS NULL
  AND onboarding_status IS NULL;
