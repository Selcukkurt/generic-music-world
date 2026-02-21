-- Add role and email to profiles for RBAC
-- role: system_owner | ceo | admin | staff | viewer

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing rows (run separately if needed)
-- UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;
