-- Add can_login to profiles for explicit login control
-- role_level 5 (FIELD_STAFF) → can_login false by definition
-- Others default true; can be overridden per-profile

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT true;

-- Field staff (role_level 5) cannot login
UPDATE public.profiles
SET can_login = false
WHERE role_level = 5;
