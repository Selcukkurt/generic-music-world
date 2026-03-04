-- RBAC V1: app_users, roles, permissions, role_permissions, user_roles
-- Syncs app_users from auth.users on signup

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_tr TEXT,
  description_tr TEXT,
  is_system BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  "group" TEXT,
  description_tr TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_is_active ON public.app_users(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON public.role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- ============================================================
-- 2. TRIGGER: Sync app_users from auth.users on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_app_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_app_users ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_app_users
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_app_user_from_auth();

-- updated_at trigger for app_users
CREATE OR REPLACE FUNCTION public.app_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS app_users_updated_at ON public.app_users;
CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.app_users_updated_at();

-- Backfill existing auth.users into app_users
INSERT INTO public.app_users (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper: is system owner
CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_owner'
  );
$$;

-- app_users: system owner manages all; users read own row
CREATE POLICY "System owner can manage app_users"
  ON public.app_users FOR ALL
  TO authenticated
  USING (public.is_system_owner())
  WITH CHECK (public.is_system_owner());

CREATE POLICY "Users can read own app_users row"
  ON public.app_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- roles: system owner manages
CREATE POLICY "System owner can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (public.is_system_owner())
  WITH CHECK (public.is_system_owner());

-- permissions: system owner manages
CREATE POLICY "System owner can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.is_system_owner())
  WITH CHECK (public.is_system_owner());

-- role_permissions: system owner manages
CREATE POLICY "System owner can manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_system_owner())
  WITH CHECK (public.is_system_owner());

-- user_roles: system owner manages
CREATE POLICY "System owner can manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_system_owner())
  WITH CHECK (public.is_system_owner());

-- Allow users to read their own roles (for permission resolution)
CREATE POLICY "Users can read own user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to read roles they are assigned to
CREATE POLICY "Users can read assigned roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.role_id = roles.id AND ur.user_id = auth.uid()
    )
    OR public.is_system_owner()
  );

-- Allow users to read permissions for their roles
CREATE POLICY "Users can read permissions for own roles"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.role_id = role_permissions.role_id AND ur.user_id = auth.uid()
    )
    OR public.is_system_owner()
  );

-- Allow all authenticated to read permissions catalog (for UI)
CREATE POLICY "Authenticated can read permissions catalog"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 4. SEED: Roles
-- ============================================================

INSERT INTO public.roles (key, name_tr, description_tr, is_system) VALUES
  ('owner', 'Sahip', 'Tam sistem erişimi', true),
  ('admin', 'Yönetici', 'Yönetim ve yapılandırma erişimi', true),
  ('manager', 'Müdür', 'Modül düzenleme ve kullanıcı davet', false),
  ('viewer', 'Görüntüleyici', 'Salt okunur erişim', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. SEED: Permissions
-- ============================================================

INSERT INTO public.permissions (key, "group", description_tr) VALUES
  ('users.read', 'users', 'Kullanıcıları görüntüle'),
  ('users.invite', 'users', 'Kullanıcı davet et'),
  ('users.disable', 'users', 'Kullanıcı devre dışı bırak'),
  ('rbac.roles.read', 'rbac', 'Rolleri görüntüle'),
  ('rbac.roles.write', 'rbac', 'Rolleri düzenle'),
  ('rbac.permissions.read', 'rbac', 'İzinleri görüntüle'),
  ('modules.m01.view', 'modules', 'Modül M01 görüntüle'),
  ('modules.m01.edit', 'modules', 'Modül M01 düzenle'),
  ('modules.m02.view', 'modules', 'Modül M02 görüntüle'),
  ('modules.m02.edit', 'modules', 'Modül M02 düzenle'),
  ('modules.m03.view', 'modules', 'Modül M03 görüntüle'),
  ('modules.m03.edit', 'modules', 'Modül M03 düzenle'),
  ('modules.m04.view', 'modules', 'Modül M04 görüntüle'),
  ('modules.m04.edit', 'modules', 'Modül M04 düzenle'),
  ('modules.m05.view', 'modules', 'Modül M05 görüntüle'),
  ('modules.m05.edit', 'modules', 'Modül M05 düzenle'),
  ('modules.m06.view', 'modules', 'Modül M06 görüntüle'),
  ('modules.m06.edit', 'modules', 'Modül M06 düzenle'),
  ('modules.m07.view', 'modules', 'Modül M07 görüntüle'),
  ('modules.m07.edit', 'modules', 'Modül M07 düzenle'),
  ('modules.m08.view', 'modules', 'Modül M08 görüntüle'),
  ('modules.m08.edit', 'modules', 'Modül M08 düzenle'),
  ('modules.m09.view', 'modules', 'Modül M09 görüntüle'),
  ('modules.m09.edit', 'modules', 'Modül M09 düzenle'),
  ('modules.m10.view', 'modules', 'Modül M10 görüntüle'),
  ('modules.m10.edit', 'modules', 'Modül M10 düzenle'),
  ('modules.m11.view', 'modules', 'Modül M11 görüntüle'),
  ('modules.m11.edit', 'modules', 'Modül M11 düzenle'),
  ('modules.m12.view', 'modules', 'Modül M12 görüntüle'),
  ('modules.m12.edit', 'modules', 'Modül M12 düzenle')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. SEED: Role permissions
-- ============================================================

-- Owner: all permissions
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'owner'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Admin: all permissions
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Manager: read + invite + rbac read + all module view/edit
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'manager'
  AND (
    p.key IN ('users.read', 'users.invite', 'rbac.roles.read', 'rbac.permissions.read')
    OR p.key LIKE 'modules.%.view'
    OR p.key LIKE 'modules.%.edit'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Viewer: read only (users.read, rbac.roles.read, rbac.permissions.read, modules.*.view)
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'viewer'
  AND (
    p.key IN ('users.read', 'rbac.roles.read', 'rbac.permissions.read')
    OR p.key LIKE 'modules.%.view'
  )
ON CONFLICT (role_id, permission_key) DO NOTHING;
