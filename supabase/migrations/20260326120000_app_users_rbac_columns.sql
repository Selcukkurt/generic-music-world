-- Canonical RBAC fields on app_users (profiles no longer authoritative for access).
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS role_level INTEGER;

-- Backfill from profiles where app_users columns are null
UPDATE public.app_users au
SET
  role = COALESCE(au.role, p.role),
  role_level = COALESCE(au.role_level, p.role_level)
FROM public.profiles p
WHERE p.id = au.id
  AND (au.role IS NULL OR au.role_level IS NULL);

-- Ensure can_login exists (20260325120000) and aligns with is_active + role_level
UPDATE public.app_users
SET can_login = CASE
  WHEN is_active IS FALSE THEN FALSE
  WHEN role_level = 5 THEN FALSE
  ELSE COALESCE(can_login, true)
END
WHERE true;
