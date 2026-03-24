-- Login eligibility lives on app_users (profiles.can_login may be absent in some envs).
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS can_login BOOLEAN NOT NULL DEFAULT true;

UPDATE public.app_users au
SET can_login = false
WHERE au.is_active IS FALSE;

UPDATE public.app_users au
SET can_login = false
FROM public.profiles p
WHERE p.id = au.id AND p.role_level = 5;
