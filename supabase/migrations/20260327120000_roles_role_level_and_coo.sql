-- Canonical RBAC: store hierarchy on public.roles and guarantee COO/CEO rows.
-- COO (level 2) must exist for Users tab / assignUserRoles; mapping prefers role_level in app code.

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS role_level SMALLINT;

COMMENT ON COLUMN public.roles.role_level IS 'RBAC hierarchy 0–6 (aligned with app_users.role_level / profiles.role_level).';

-- Upsert CEO / COO with canonical keys, Turkish titles, and role_level.
INSERT INTO public.roles (key, name_tr, description_tr, is_system, role_level) VALUES
  ('ceo', 'CEO', 'Chief Executive Officer', true, 1),
  ('coo', 'COO', 'Chief Operating Officer', true, 2)
ON CONFLICT (key) DO UPDATE SET
  name_tr = EXCLUDED.name_tr,
  description_tr = EXCLUDED.description_tr,
  is_system = EXCLUDED.is_system,
  role_level = EXCLUDED.role_level;

-- Backfill role_level for existing seed keys (idempotent).
UPDATE public.roles SET role_level = 0 WHERE key IN ('admin', 'super_admin', 'system_owner');
UPDATE public.roles SET role_level = 1 WHERE key IN ('owner', 'ceo');
UPDATE public.roles SET role_level = 2 WHERE key = 'coo';
UPDATE public.roles SET role_level = 3 WHERE key IN ('director', 'lead', 'direktor');
UPDATE public.roles SET role_level = 4 WHERE key IN ('manager', 'admin_legacy', 'staff', 'yonetici');
UPDATE public.roles SET role_level = 5 WHERE key IN ('field', 'staff_field', 'saha', 'saha_personeli');
UPDATE public.roles SET role_level = 6 WHERE key IN ('viewer', 'gozlemci', 'ortak');

-- Permissions: clone from owner → ceo, director → coo (same as 20260325120000_rbac_roles_coo_ceo).
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, rp.permission_key
FROM public.roles r
INNER JOIN public.roles r_src ON r_src.key = 'owner'
INNER JOIN public.role_permissions rp ON rp.role_id = r_src.id
WHERE r.key = 'ceo'
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, rp.permission_key
FROM public.roles r
INNER JOIN public.roles r_src ON r_src.key = 'director'
INNER JOIN public.role_permissions rp ON rp.role_id = r_src.id
WHERE r.key = 'coo'
ON CONFLICT (role_id, permission_key) DO NOTHING;
