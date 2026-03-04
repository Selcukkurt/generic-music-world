/**
 * RBAC V1 – permission check helper
 * Use with permissions array from usePermissions or server context
 *
 * Supports:
 * - Exact match: event.view
 * - Full wildcard: * or owner
 * - Module wildcard: event.* matches event.view, event.create, etc.
 * - Legacy: modules.*.view matches modules.m01.view
 */

export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  if (permissions.includes("*") || permissions.includes("owner")) return true;
  if (permissions.includes(required)) return true;
  const parts = required.split(".");
  // module.action (e.g. event.view)
  if (parts.length === 2) {
    const [module, action] = parts;
    if (module && action) {
      return permissions.some(
        (p) => p === `${module}.${action}` || p === `${module}.*`
      );
    }
  }
  // Legacy: group.sub.action (e.g. modules.m01.view)
  if (parts.length === 3) {
    const [group, sub, action] = parts;
    if (group && sub === "*" && action) {
      const pattern = `${group}.`;
      return permissions.some(
        (p) => p.startsWith(pattern) && p.endsWith(`.${action}`)
      );
    }
  }
  return false;
}
