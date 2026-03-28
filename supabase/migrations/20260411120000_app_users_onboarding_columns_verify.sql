-- Blocking fix: ensure onboarding gate columns exist (idempotent).
-- If this migration never ran on your Supabase project, the API used to error on SELECT/UPDATE
-- containing onboarding_completed_at. Pair with scripts/sql/verify-and-add-app-users-onboarding-columns.sql
-- for manual repair on the correct database.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

UPDATE public.app_users
SET onboarding_status = 'completed'
WHERE onboarding_completed_at IS NOT NULL
  AND (onboarding_status IS DISTINCT FROM 'completed');
