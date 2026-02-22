-- Extend profiles for Personel Listesi (team management)
-- Add missing columns

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS team TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ensure role has default
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'staff';

-- Indexes for personnel list
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- updated_at trigger (reuse set_updated_at)
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Helper: is_lead_or_admin - can view/update other profiles
CREATE OR REPLACE FUNCTION public.is_lead_or_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('system_owner', 'ceo', 'admin', 'lead')
  );
$$;

-- RLS: extend for leads/admins
-- Drop existing restrictive policies and add new ones
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Select: own profile OR lead/admin can see all
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Leads and admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

-- Update: own profile (full) OR lead/admin can update limited fields for others
-- For lead/admin updating others, we allow update - app logic restricts which fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Leads and admins can update other profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_lead_or_admin(auth.uid()))
  WITH CHECK (public.is_lead_or_admin(auth.uid()));
