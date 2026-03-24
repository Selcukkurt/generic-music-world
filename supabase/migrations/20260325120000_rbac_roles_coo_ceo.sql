-- Add CEO / COO role rows so UI levels 1–2 map to real roles (Users tab / RBAC).
-- Permissions cloned from owner (ceo) and director (coo) when those roles exist.

INSERT INTO public.roles (key, name_tr, description_tr, is_system) VALUES
  ('ceo', 'CEO', 'Chief Executive Officer', true),
  ('coo', 'COO', 'Chief Operating Officer', true)
ON CONFLICT (key) DO UPDATE SET
  name_tr = EXCLUDED.name_tr,
  description_tr = EXCLUDED.description_tr,
  is_system = EXCLUDED.is_system;

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
