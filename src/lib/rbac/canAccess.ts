/**
 * RBAC permission matrix.
 * owner: all
 * admin: view/manage most (except personnel manage for future granularity)
 * staff: view modules, no personnel manage
 * viewer: view-only limited (dashboard, profile, modules view)
 */

import type { Action, Resource, Role } from "./types";

const MATRIX: Partial<Record<Role, Partial<Record<Resource, Action[]>>>> = {
  owner: {
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
  const allowed = MATRIX[role]?.[resource];
  if (!allowed) return false;
  return allowed.includes(action);
}
