/**
 * RBAC types – professional separation: SYSTEM_OWNER vs CEO.
 * SYSTEM_OWNER: full system + business access.
 * CEO: business-only, no system permissions.
 */

export type Role = "system_owner" | "ceo" | "admin" | "lead" | "staff" | "viewer";

/** Legacy alias – maps to ceo for backward compatibility. */
export type LegacyRole = "owner";

export type Resource =
  | "dashboard"
  | "modules"
  | "personnel"
  | "profile"
  | "settings"
  | "notifications";

/** System resources – accessible ONLY by SYSTEM_OWNER. */
export type SystemResource =
  | "system_rbac"
  | "system_settings"
  | "system_release"
  | "system_security"
  | "system_migration";

export type Action = "view" | "manage";

export type Permission = {
  resource: Resource;
  action: Action;
};

/** SYSTEM_* permission namespace. */
export const SYSTEM_PERMISSIONS = [
  "SYSTEM_RBAC_MANAGE",
  "SYSTEM_SETTINGS",
  "SYSTEM_RELEASE",
  "SYSTEM_SECURITY",
  "SYSTEM_MIGRATION",
] as const;

/** BUSINESS_* permission namespace. */
export const BUSINESS_PERMISSIONS = [
  "BUSINESS_DASHBOARD_VIEW",
  "BUSINESS_EVENT_MANAGE",
  "BUSINESS_ARTIST_MANAGE",
  "BUSINESS_FINANCE_VIEW",
  "BUSINESS_MODULES_VIEW",
  "BUSINESS_PERSONNEL_VIEW",
  "BUSINESS_PROFILE_VIEW",
  "BUSINESS_SETTINGS_VIEW",
  "BUSINESS_NOTIFICATIONS_VIEW",
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];
export type BusinessPermission = (typeof BUSINESS_PERMISSIONS)[number];
