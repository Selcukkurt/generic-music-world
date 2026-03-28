-- Run in Supabase SQL Editor for the SAME project as NEXT_PUBLIC_SUPABASE_URL / .env
-- (production vs local mismatch is a common cause of "column does not exist".)

-- ---------------------------------------------------------------------------
-- 1) VERIFY — expect rows including onboarding_completed_at, onboarding_status
-- ---------------------------------------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_users'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- 2) APPLY — idempotent (safe to re-run). Matches app expectations.
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

UPDATE public.app_users
SET onboarding_status = 'completed'
WHERE onboarding_completed_at IS NOT NULL
  AND (onboarding_status IS DISTINCT FROM 'completed');

-- Optional: PostgREST schema reload (Supabase dashboard often refreshes automatically)
-- NOTIFY pgrst, 'reload schema';
