/**
 * RBAC V1 Clean Model – role and permission constants
 * New model: 6 roles, module.action permissions
 */

/** New model role keys (display first in UI, default view) */
export const NEW_ROLE_KEYS = [
  "owner",
  "admin",
  "director",
  "manager",
  "staff",
  "field",
] as const;

/** New model permission groups (module.action pattern) - default view */
export const NEW_PERMISSION_GROUPS = [
  "dashboard",
  "event",
  "finance",
  "marketing",
  "artist_ops",
  "ticketing",
  "system",
] as const;

export function isNewRole(key: string): boolean {
  return NEW_ROLE_KEYS.includes(key as (typeof NEW_ROLE_KEYS)[number]);
}

export function isNewPermissionGroup(group: string | null): boolean {
  if (!group) return false;
  return NEW_PERMISSION_GROUPS.includes(group as (typeof NEW_PERMISSION_GROUPS)[number]);
}

/** Check if permission key matches module.action pattern (fallback when group may be missing) */
export function isNewPermissionKey(key: string): boolean {
  const [module] = key.split(".");
  return !!module && NEW_PERMISSION_GROUPS.includes(module as (typeof NEW_PERMISSION_GROUPS)[number]);
}
