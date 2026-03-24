/**
 * RBAC V1 – Supabase-backed roles and permissions
 */

export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  key: string;
  name_tr: string | null;
  description_tr: string | null;
  is_system: boolean;
  /** Canonical hierarchy 0–6 when set (public.roles.role_level). */
  role_level?: number | null;
};

export type Permission = {
  key: string;
  group: string | null;
  description_tr: string | null;
};

export type AppUserWithRoles = AppUser & {
  roles: Role[];
  /** From profiles.role */
  role_code?: string | null;
  /** From profiles.role_level (0-6). */
  role_level?: number | null;
  /** From app_users.can_login (with derive fallback from role_level / is_active). */
  can_login?: boolean | null;
  /** Derived or from app_users when migrated */
  lifecycle_status?: "active" | "passive" | "archived";
  linked_personnel_id?: string | null;
  linked_personnel_name?: string | null;
  last_login_at?: string | null;
};
