-- Organization departments
CREATE TABLE IF NOT EXISTS public.org_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

-- Organization teams
CREATE TABLE IF NOT EXISTS public.org_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  department_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (department_id, name)
);

-- Org settings singleton (id=1)
CREATE TABLE IF NOT EXISTS public.org_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  default_role TEXT NOT NULL DEFAULT 'staff',
  default_department_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
  default_team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  require_approval_for_role_change BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

DROP TRIGGER IF EXISTS org_settings_updated_at ON public.org_settings;
CREATE TRIGGER org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Ensure singleton row exists
INSERT INTO public.org_settings (id, default_role)
VALUES (1, 'staff')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Admins only (uses existing is_admin)
CREATE POLICY "Admins full access org_departments"
  ON public.org_departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins full access org_teams"
  ON public.org_teams FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins full access org_settings"
  ON public.org_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
