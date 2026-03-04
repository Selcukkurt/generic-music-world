/**
 * RBAC V1 – permission check helper
 * Use with permissions array from usePermissions or server context
 */

/** Check if user has a specific permission. Supports wildcard: "modules.*.view" matches "modules.m01.view" */
export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  if (permissions.includes("*") || permissions.includes("owner")) return true;
  if (permissions.includes(required)) return true;
  const [group, sub, action] = required.split(".");
  if (group && sub === "*" && action) {
    const pattern = `${group}.`;
    return permissions.some((p) => p.startsWith(pattern) && p.endsWith(`.${action}`));
  }
  return false;
}
