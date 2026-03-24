-- Align app_users SELECT with API GET /api/rbac/users (requireOwnerOrAdmin).
-- is_lead_or_admin() includes lead but NOT coo — COO could pass the API yet see only own row under RLS.
CREATE OR REPLACE FUNCTION public.can_read_rbac_user_directory(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('system_owner', 'ceo', 'coo', 'admin')
  );
$$;

COMMENT ON FUNCTION public.can_read_rbac_user_directory(uuid) IS
  'Matches app-layer requireOwnerOrAdmin for RBAC user list visibility.';

DROP POLICY IF EXISTS "RBAC directory reads app_users" ON public.app_users;
CREATE POLICY "RBAC directory reads app_users"
  ON public.app_users FOR SELECT TO authenticated
  USING (public.can_read_rbac_user_directory(auth.uid()));
