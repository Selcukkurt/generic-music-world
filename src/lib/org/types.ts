/**
 * Organization settings types.
 */

export interface OrgDepartment {
  id: string;
  created_at: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface OrgTeam {
  id: string;
  created_at: string;
  department_id: string | null;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface OrgSettings {
  id: number;
  created_at: string;
  updated_at: string;
  default_role: string;
  default_department_id: string | null;
  default_team_id: string | null;
  require_approval_for_role_change: boolean;
  metadata: Record<string, unknown>;
}

export const DEFAULT_ROLE_OPTIONS = [
  { id: "staff", label: "Personel" },
  { id: "lead", label: "Ekip Lideri" },
  { id: "viewer", label: "İzleyici" },
] as const;
