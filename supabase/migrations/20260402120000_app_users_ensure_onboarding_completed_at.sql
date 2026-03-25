-- Ensure onboarding completion + activation timestamps exist on app_users.
-- Idempotent. Fixes environments where 20260330000000_user_access_phase_compliance.sql
-- was never applied (or only partially), which caused runtime errors selecting
-- onboarding_completed_at / activating_at.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.app_users.onboarding_completed_at IS
  'When mandatory compliance onboarding finished (before activation).';

COMMENT ON COLUMN public.app_users.activated_at IS
  'When access_phase became active (personnel + role assigned and personnel linked).';

-- Do not force long-tenured users through onboarding when the column appears.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'access_phase'
  ) THEN
    UPDATE public.app_users
    SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
    WHERE COALESCE(access_phase, 'active') = 'active'
      AND onboarding_completed_at IS NULL;
  END IF;
END $$;
