import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";

/** Primary assigned role key from user_roles → roles join. */
export function primaryRoleKeyFromUserRoles(
  ur: Array<{ roles: Record<string, unknown> | null }> | null | undefined
): string | null {
  const k = ur?.find((x) => x.roles)?.roles?.key as string | undefined;
  return k ?? null;
}

export function resolveRoleLevelFromUserRoles(
  ur: Array<{ roles: Record<string, unknown> | null }> | null | undefined
): number | null {
  const key = primaryRoleKeyFromUserRoles(ur);
  if (!key) return null;
  return LEGACY_ROLE_TO_LEVEL[key.toLowerCase()] ?? null;
}
