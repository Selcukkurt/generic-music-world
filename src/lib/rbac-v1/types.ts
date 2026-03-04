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
};

export type Permission = {
  key: string;
  group: string | null;
  description_tr: string | null;
};

export type AppUserWithRoles = AppUser & {
  roles: Role[];
};
