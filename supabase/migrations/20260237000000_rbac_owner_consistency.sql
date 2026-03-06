-- RBAC Owner Consistency: single owner, ceo gets admin
-- 1. Remove owner from ceo profiles (they should have admin, not owner)
-- 2. Assign admin to ceo profiles
-- 3. Enforce single owner: only system_owner should have owner

-- ============================================================
-- 1. Remove owner from non-system_owner profiles
-- ============================================================
DELETE FROM public.user_roles ur
USING public.profiles p
JOIN public.roles r ON r.id = ur.role_id AND r.key = 'owner'
WHERE ur.user_id = p.id
  AND p.role != 'system_owner';

-- ============================================================
-- 2. Assign admin role to ceo profiles (CEO = business admin, not system owner)
-- ============================================================
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id FROM public.profiles p
JOIN public.roles r ON r.key = 'admin'
WHERE p.role = 'ceo'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================
-- 3. Ensure system_owner has owner (idempotent)
-- ============================================================
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id FROM public.profiles p
JOIN public.roles r ON r.key = 'owner'
WHERE p.role = 'system_owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
