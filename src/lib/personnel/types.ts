/**
 * Personnel / profiles types for team management.
 */

export type ProfileRole =
  | "system_owner"
  | "ceo"
  | "admin"
  | "lead"
  | "staff"
  | "viewer";

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  department: string | null;
  team: string | null;
  title: string | null;
  phone: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  system_owner: "Super Admin",
  ceo: "CEO",
  admin: "Admin",
  lead: "Ekip Lideri",
  staff: "Personel",
  viewer: "İzleyici",
};

export const ROLES: ProfileRole[] = [
  "system_owner",
  "ceo",
  "admin",
  "lead",
  "staff",
  "viewer",
];
