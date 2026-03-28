-- Split display name for onboarding UX and directory; full_name remains canonical combined form.
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN public.app_users.first_name IS 'Given name; combined with last_name mirrors full_name where maintained.';
COMMENT ON COLUMN public.app_users.last_name IS 'Family name; combined with first_name mirrors full_name where maintained.';
