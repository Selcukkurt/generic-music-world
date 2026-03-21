-- Add role_level to profiles for Turkish RBAC hierarchy
-- 0: Super Admin (Dev), 1: CEO, 2: COO, 3: Direktör, 4: Yönetici, 5: Saha Personeli, 6: Gözlemci

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_level SMALLINT;

CREATE INDEX IF NOT EXISTS idx_profiles_role_level ON public.profiles(role_level);

-- Backfill: map existing role text to role_level
UPDATE public.profiles SET role_level = 0 WHERE role IN ('system_owner', 'super_admin');
UPDATE public.profiles SET role_level = 1 WHERE role = 'ceo' AND role_level IS NULL;
UPDATE public.profiles SET role_level = 4 WHERE role IN ('admin', 'staff') AND role_level IS NULL;
UPDATE public.profiles SET role_level = 3 WHERE role = 'lead' AND role_level IS NULL;
UPDATE public.profiles SET role_level = 6 WHERE role = 'viewer' AND role_level IS NULL;
