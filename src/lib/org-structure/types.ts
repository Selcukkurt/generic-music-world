/**
 * Organization structure types – separate from RBAC
 */

export type OrgUnit = {
  id: string;
  name: string;
  parent_id: string | null;
  module_code: string | null;
  level: number;
  active: boolean;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrgUnitWithDetails = OrgUnit & {
  parent?: { id: string; name: string } | null;
  manager?: { id: string; full_name: string | null } | null;
};

export type JobTitle = {
  id: string;
  name: string;
  category: string | null;
  rank_order: number;
  active: boolean;
  org_unit_id?: string | null;
  rbac_role?: string | null;
  reports_to_job_title_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type PersonAssignment = {
  id: string;
  person_id: string;
  org_unit_id: string;
  job_title_id: string;
  reports_to_person_id: string | null;
  assignment_type: string;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PersonAssignmentWithDetails = PersonAssignment & {
  org_unit?: OrgUnit;
  job_title?: JobTitle;
  person?: { id: string; full_name: string | null; email: string | null; avatar_url?: string | null };
  reports_to?: { id: string; full_name: string | null; email: string | null };
  has_login?: boolean;
  rbac_role?: string;
};

/** Tree node for org hierarchy (reports_to based) */
export type OrgTreeNode = {
  assignment: PersonAssignmentWithDetails;
  children: OrgTreeNode[];
};

/** Tree node for org_units hierarchy (parent_id based). Each node = org unit + primary assignment. */
export type OrgUnitTreeNode = {
  unit: OrgUnit;
  primaryAssignment: PersonAssignmentWithDetails | null;
  children: OrgUnitTreeNode[];
};
