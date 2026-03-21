/**
 * Centralized RBAC helpers.
 * Uses profiles.role_level as the main hierarchy source.
 */

import {
  ROLE_LEVEL,
  ROLE_LABELS,
  LEGACY_ROLE_TO_LEVEL,
  SYSTEM_RBAC_ROUTES,
  SUPER_ADMIN_ONLY_ROUTES,
  type RBACProfile,
} from "./roleConfig";

const DISABLE_RBAC =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DISABLE_RBAC === "true";

/** Resolve effective role_level from profile (role_level primary, role fallback via legacy map). */
function getRoleLevel(profile: RBACProfile | null | undefined): number {
  if (!profile) return ROLE_LEVEL.OBSERVER;
  if (typeof profile.role_level === "number" && profile.role_level >= 0 && profile.role_level <= 6) {
    return profile.role_level;
  }
  const r = String(profile.role ?? "").toLowerCase().replace(/\s+/g, "_");
  return LEGACY_ROLE_TO_LEVEL[r] ?? ROLE_LEVEL.OBSERVER;
}

/** Block login if role_level === 5 (FIELD_STAFF) OR can_login === false. */
export function canLogin(profile: RBACProfile | null | undefined): boolean {
  if (DISABLE_RBAC) return true;
  if (!profile) return false;
  const level = getRoleLevel(profile);
  if (level === ROLE_LEVEL.FIELD_STAFF) return false;
  if (profile.can_login === false) return false;
  return true;
}

/** Check if profile has at least the required role level (lower number = higher authority). */
export function hasMinimumRole(
  profile: RBACProfile | null | undefined,
  requiredLevel: number
): boolean {
  if (DISABLE_RBAC) return true;
  if (!profile) return false;
  if (isSuperAdmin(profile)) return true;
  const level = getRoleLevel(profile);
  return level <= requiredLevel;
}

/** Check if profile can access the given route. */
export function canAccessRoute(
  profile: RBACProfile | null | undefined,
  route: string
): boolean {
  if (DISABLE_RBAC) return true;
  if (!profile) return false;
  if (isSuperAdmin(profile)) return true;
  const level = getRoleLevel(profile);

  if (SYSTEM_RBAC_ROUTES.some((r) => route === r || route.startsWith(r + "/"))) {
    return level <= ROLE_LEVEL.COO;
  }

  if (SUPER_ADMIN_ONLY_ROUTES.some((r) => route === r || route.startsWith(r + "/"))) {
    return false;
  }

  return true;
}

/** Check if profile can perform action on resource within scope. */
export function canPerform(
  profile: RBACProfile | null | undefined,
  action: "view" | "create" | "update" | "delete" | "manage",
  _resource: string,
  _scope?: string
): boolean {
  if (DISABLE_RBAC) return true;
  if (!profile) return false;
  if (isSuperAdmin(profile)) return true;
  const level = getRoleLevel(profile);

  if (level === ROLE_LEVEL.FIELD_STAFF) return false;
  if (level === ROLE_LEVEL.OBSERVER) return action === "view";

  if (action === "view") return level <= ROLE_LEVEL.OBSERVER;
  if (["create", "update", "delete", "manage"].includes(action)) {
    return level <= ROLE_LEVEL.MANAGER;
  }
  return false;
}

/** Resolve module authority: Director assigned, else COO, else CEO. Super Admin overrides. */
export function resolveModuleAuthority(
  _moduleId: string,
  profile: RBACProfile | null | undefined
): "director" | "coo" | "ceo" | "super_admin" | null {
  if (DISABLE_RBAC) return "super_admin";
  if (!profile) return null;
  if (isSuperAdmin(profile)) return "super_admin";
  const level = getRoleLevel(profile);
  if (level <= ROLE_LEVEL.CEO) return "ceo";
  if (level <= ROLE_LEVEL.COO) return "coo";
  if (level <= ROLE_LEVEL.DIRECTOR) return "director";
  return null;
}

/** Observer / Partner: read-only mode. */
export function isReadOnly(profile: RBACProfile | null | undefined): boolean {
  if (!profile) return false;
  return getRoleLevel(profile) === ROLE_LEVEL.OBSERVER;
}

/** Field Staff / Specialist: no login. */
export function isFieldStaff(profile: RBACProfile | null | undefined): boolean {
  if (!profile) return false;
  return getRoleLevel(profile) === ROLE_LEVEL.FIELD_STAFF;
}

/** Super Admin (Dev): technical override, unrestricted. */
export function isSuperAdmin(profile: RBACProfile | null | undefined): boolean {
  if (!profile) return false;
  return getRoleLevel(profile) === ROLE_LEVEL.SUPER_ADMIN_DEV;
}

/** Get role label for display (Turkish). */
export function getRoleLabel(profile: RBACProfile | null | undefined): string {
  const level = getRoleLevel(profile);
  return ROLE_LABELS[level] ?? "Gözlemci / Ortak";
}

/** Convert CurrentUser-like to RBACProfile for helpers. */
export function toRBACProfile(
  user: { role_level?: number | null; role?: string | null; can_login?: boolean | null } | null
): RBACProfile | null {
  if (!user) return null;
  return { role_level: user.role_level, role: user.role, can_login: user.can_login };
}
