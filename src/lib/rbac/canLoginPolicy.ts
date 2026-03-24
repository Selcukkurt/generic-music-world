/**
 * Single source for “may this user sign in?” using app_users fields only.
 * Field staff (role_level 5) never gets login. Inactive accounts do not.
 */

export function deriveCanLoginFromRoleAndActive(
  roleLevel: number | null | undefined,
  isActive: boolean | null | undefined
): boolean {
  if (isActive === false) return false;
  const level = roleLevel ?? 6;
  if (level === 5) return false;
  return true;
}

/**
 * Prefer app_users.can_login when set; otherwise derive from role_level + is_active.
 */
export function resolveCanLogin(
  appUser: {
    can_login?: boolean | null;
    is_active?: boolean | null;
    role_level?: number | null;
  } | null | undefined
): boolean {
  if (!appUser) return true;
  if (typeof appUser.can_login === "boolean") return appUser.can_login;
  return deriveCanLoginFromRoleAndActive(appUser.role_level, appUser.is_active);
}
