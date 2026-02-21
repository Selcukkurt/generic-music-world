/**
 * RBAC permission matrix.
 * SYSTEM_OWNER: ALL SYSTEM_* + ALL BUSINESS_* (full access).
 * CEO: ONLY BUSINESS_* (no system permissions).
 * admin/staff/viewer: business-only, granular.
 */

import type { Action, Resource, Role, SystemResource } from "./types";

/** Business resource matrix – CEO and below. */
const BUSINESS_MATRIX: Partial<Record<Role, Partial<Record<Resource, Action[]>>>> = {
  system_owner: {
    dashboard: ["view", "manage"],
    modules: ["view", "manage"],
    personnel: ["view", "manage"],
    profile: ["view", "manage"],
    settings: ["view", "manage"],
    notifications: ["view", "manage"],
  },
  ceo: {
    dashboard: ["view", "manage"],
    modules: ["view", "manage"],
    personnel: ["view", "manage"],
    profile: ["view", "manage"],
    settings: ["view", "manage"],
    notifications: ["view", "manage"],
  },
  admin: {
    dashboard: ["view", "manage"],
    modules: ["view", "manage"],
    personnel: ["view", "manage"],
    profile: ["view", "manage"],
    settings: ["view", "manage"],
    notifications: ["view", "manage"],
  },
  staff: {
    dashboard: ["view"],
    modules: ["view"],
    personnel: ["view"],
    profile: ["view", "manage"],
    settings: ["view"],
    notifications: ["view"],
  },
  viewer: {
    dashboard: ["view"],
    modules: ["view"],
    personnel: [],
    profile: ["view"],
    settings: [],
    notifications: ["view"],
  },
};

export function canAccess(
  role: Role,
  resource: Resource,
  action: Action
): boolean {
  const allowed = BUSINESS_MATRIX[role]?.[resource];
  if (!allowed) return false;
  return allowed.includes(action);
}

/** Check if role can access any SYSTEM_* resource. CEO returns false. */
export function canAccessSystem(role: Role | null): boolean {
  return role === "system_owner";
}

/** Check if role can access a specific system resource. */
export function canAccessSystemResource(
  role: Role | null,
  _resource: SystemResource
): boolean {
  void _resource; // Reserved for future per-resource checks
  return role === "system_owner";
}

/** Check if role can access business resources (dashboard, modules, etc.). */
export function canAccessBusiness(role: Role | null): boolean {
  if (!role) return false;
  return ["system_owner", "ceo", "admin", "staff", "viewer"].includes(role);
}
