-- User-Personnel Linking: RBAC users and HR personnel are separate but linkable
-- personnel.profile_id (nullable) links to auth.users.id when the same person exists in both systems
-- No auto-create in either direction; linking is explicit

-- Allow leads and admins to read app_users for personnel linking dropdown
-- (personnel.manage requires lead/admin; they need to see users to link)
DROP POLICY IF EXISTS "Leads and admins read app_users for linking" ON public.app_users;
CREATE POLICY "Leads and admins read app_users for linking"
  ON public.app_users FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

-- Allow leads and admins to read user_roles + roles for personnel card "System Access" display
DROP POLICY IF EXISTS "Leads and admins read user_roles for personnel" ON public.user_roles;
CREATE POLICY "Leads and admins read user_roles for personnel"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Leads and admins read roles for personnel" ON public.roles;
CREATE POLICY "Leads and admins read roles for personnel"
  ON public.roles FOR SELECT TO authenticated
  USING (public.is_lead_or_admin(auth.uid()));
