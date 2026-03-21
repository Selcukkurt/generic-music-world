/**
 * Route guard logic for RBAC.
 */

import { canAccessRoute, canLogin } from "./rbacHelpers";
import type { RBACProfile } from "./roleConfig";

const DISABLE_RBAC =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DISABLE_RBAC === "true";

export type RouteGuardResult =
  | { allowed: true }
  | { allowed: false; redirect: "/login" | "/forbidden" };

/**
 * Check if profile can access the given route.
 * Returns redirect path if not allowed.
 */
export function checkRouteAccess(
  profile: RBACProfile | null | undefined,
  pathname: string
): RouteGuardResult {
  if (DISABLE_RBAC) return { allowed: true };
  if (!profile) return { allowed: false, redirect: "/login" };
  if (!canLogin(profile)) return { allowed: false, redirect: "/login" };
  if (!canAccessRoute(profile, pathname)) return { allowed: false, redirect: "/forbidden" };
  return { allowed: true };
}
