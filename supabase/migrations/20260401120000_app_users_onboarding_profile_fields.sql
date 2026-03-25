-- Onboarding profile capture (name / title / department) on app_users for API persistence.
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;

COMMENT ON COLUMN public.app_users.title IS 'Job title as entered during onboarding (display; personnel job title may differ).';
COMMENT ON COLUMN public.app_users.department IS 'Department as entered during onboarding.';
