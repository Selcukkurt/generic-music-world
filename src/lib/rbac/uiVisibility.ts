/**
 * UI visibility helpers for role-aware sidebar and menus.
 */

import { canAccessRoute, isSuperAdmin, toRBACProfile } from "./rbacHelpers";
import type { RBACProfile } from "./roleConfig";
import type { SidebarNavItem, SystemSidebarNavItem } from "@/config/sidebar";

/** User-like with role_level for RBAC. */
type UserLike = { role_level?: number | null; role?: string | null } | null;

/** Filter sidebar items by route access. */
export function filterSidebarItemsByRoute(
  items: SidebarNavItem[],
  user: UserLike
): SidebarNavItem[] {
  const profile = toRBACProfile(user);
  return items.filter((item) => {
    if ("systemOnly" in item && item.systemOnly) return isSuperAdmin(profile);
    return canAccessRoute(profile, item.href);
  });
}

/** Filter system sidebar items. RBAC: Super Admin/CEO/COO. Others: Super Admin only. */
export function filterSystemItemsByRoute(
  items: SystemSidebarNavItem[],
  user: UserLike
): SystemSidebarNavItem[] {
  const profile = toRBACProfile(user);
  return items.filter((item) => canAccessRoute(profile, item.href));
}

/** Whether to show the system section (any system item visible). */
export function showSystemSection(user: UserLike): boolean {
  const profile = toRBACProfile(user);
  return (
    canAccessRoute(profile, "/system/rbac") ||
    canAccessRoute(profile, "/system/settings") ||
    canAccessRoute(profile, "/system/release") ||
    canAccessRoute(profile, "/system/security") ||
    canAccessRoute(profile, "/system/migration") ||
    canAccessRoute(profile, "/audit-log")
  );
}
