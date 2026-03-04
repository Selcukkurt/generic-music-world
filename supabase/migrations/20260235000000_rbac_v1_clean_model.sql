-- RBAC V1 Clean Model: 6 roles, module.action permissions, departments
-- Does NOT modify/delete existing roles or permissions (backward compatible)

-- ============================================================
-- 1. DEPARTMENTS: department column exists (profiles_personnel)
-- Allowed values: EVENT, FINANCE, COMMERCIAL, MARKETING, ARTIST, GMS
-- ============================================================
-- No schema change needed; column already exists as TEXT

-- ============================================================
-- 2. ROLES: Add new roles (owner, admin exist; add director, staff, field)
-- ============================================================

INSERT INTO public.roles (key, name_tr, description_tr, is_system) VALUES
  ('owner', 'Owner', 'Full system access', true),
  ('admin', 'Admin', 'System management and configuration', true),
  ('director', 'Director', 'Department-level oversight and approval', true),
  ('manager', 'Manager', 'Team and module management', true),
  ('staff', 'Staff', 'Operational access', true),
  ('field', 'Field', 'Field operations access', true)
ON CONFLICT (key) DO UPDATE SET
  name_tr = EXCLUDED.name_tr,
  description_tr = EXCLUDED.description_tr;

-- ============================================================
-- 3. PERMISSIONS: New module.action permissions
-- ============================================================

INSERT INTO public.permissions (key, "group", description_tr) VALUES
  ('dashboard.view', 'dashboard', 'Dashboard görüntüle'),
  ('event.view', 'event', 'Etkinlik görüntüle'),
  ('event.create', 'event', 'Etkinlik oluştur'),
  ('event.edit', 'event', 'Etkinlik düzenle'),
  ('event.approve', 'event', 'Etkinlik onayla'),
  ('finance.view', 'finance', 'Finans görüntüle'),
  ('finance.edit', 'finance', 'Finans düzenle'),
  ('finance.approve', 'finance', 'Finans onayla'),
  ('finance.export', 'finance', 'Finans dışa aktar'),
  ('marketing.view', 'marketing', 'Pazarlama görüntüle'),
  ('marketing.edit', 'marketing', 'Pazarlama düzenle'),
  ('artist_ops.view', 'artist_ops', 'Sanatçı operasyonları görüntüle'),
  ('artist_ops.edit', 'artist_ops', 'Sanatçı operasyonları düzenle'),
  ('ticketing.view', 'ticketing', 'Biletleme görüntüle'),
  ('ticketing.edit', 'ticketing', 'Biletleme düzenle'),
  ('system.manage', 'system', 'Sistem yönetimi')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. ROLE PERMISSIONS: Seed for new model
-- ============================================================

-- Owner: system.manage + all new permissions
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'owner'
  AND p.key IN (
    'dashboard.view', 'event.view', 'event.create', 'event.edit', 'event.approve',
    'finance.view', 'finance.edit', 'finance.approve', 'finance.export',
    'marketing.view', 'marketing.edit', 'artist_ops.view', 'artist_ops.edit',
    'ticketing.view', 'ticketing.edit', 'system.manage'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Admin: system.manage + event.* + finance.* + marketing.* + artist_ops.* + ticketing.* + dashboard.view
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'admin'
  AND (
    p.key = 'system.manage'
    OR p.key = 'dashboard.view'
    OR p.key LIKE 'event.%'
    OR p.key LIKE 'finance.%'
    OR p.key LIKE 'marketing.%'
    OR p.key LIKE 'artist_ops.%'
    OR p.key LIKE 'ticketing.%'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Director: dashboard.view + event.view + event.edit + event.approve + finance.view + finance.approve + marketing.view + marketing.edit + artist_ops.view + artist_ops.edit + ticketing.view
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'director'
  AND p.key IN (
    'dashboard.view', 'event.view', 'event.edit', 'event.approve',
    'finance.view', 'finance.approve', 'marketing.view', 'marketing.edit',
    'artist_ops.view', 'artist_ops.edit', 'ticketing.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Manager: dashboard.view + event.view + event.create + event.edit + finance.view + marketing.view + marketing.edit + artist_ops.view + artist_ops.edit + ticketing.view
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'manager'
  AND p.key IN (
    'dashboard.view', 'event.view', 'event.create', 'event.edit', 'finance.view',
    'marketing.view', 'marketing.edit', 'artist_ops.view', 'artist_ops.edit', 'ticketing.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Staff: dashboard.view + event.view + event.edit + marketing.view + marketing.edit + artist_ops.view
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'staff'
  AND p.key IN (
    'dashboard.view', 'event.view', 'event.edit', 'marketing.view', 'marketing.edit', 'artist_ops.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Field: dashboard.view + event.view + event.edit
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'field'
  AND p.key IN ('dashboard.view', 'event.view', 'event.edit')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Ensure system_owner profiles have owner role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id FROM public.profiles p
JOIN public.roles r ON r.key = 'owner'
WHERE p.role = 'system_owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
