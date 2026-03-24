import type { User } from "@supabase/supabase-js";
import type { Role } from "@/lib/rbac/types";
import { resolveCanLogin } from "@/lib/rbac/canLoginPolicy";

export type AppUserLoginRow = {
  can_login?: boolean | null;
  is_active?: boolean | null;
  /** Canonical RBAC (app_users). */
  role_level?: number | null;
  role?: string | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: Role;
  role_level?: number | null;
  can_login?: boolean | null;
};

function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "system_owner" || lower === "system owner" || lower === "super_admin") return "system_owner";
  if (lower === "ceo" || lower === "owner") return "ceo";
  if (lower === "coo") return "coo";
  if (lower === "admin") return "admin";
  if (lower === "lead" || lower === "director") return "lead";
  if (lower === "staff" || lower === "manager") return "staff";
  if (lower === "viewer") return "viewer";
  return null;
}

/** Fallback when app_users.role is missing (dev/legacy). */
function resolveRoleFallback(email: string, metadata?: Record<string, unknown>): Role {
  const metaRole = metadata?.role as string | undefined;
  const parsed = parseRole(metaRole);
  if (parsed) return parsed;

  if (email === "info@genericmusic.net") return "system_owner";
  if (email === "selcuk@genericmusic.net") return "ceo";

  return "viewer";
}

/** Maps Supabase User + app_users row to CurrentUser. RBAC comes only from app_users. Pure function, server-safe. */
export function mapAuthUserToCurrentUser(
  user: User,
  appUser?: AppUserLoginRow | null
): CurrentUser {
  const email = user.email ?? "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const roleFromApp = appUser?.role;
  const role =
    parseRole(roleFromApp) ?? resolveRoleFallback(email, metadata);

  // info@genericmusic.net: fixed display name and title (keeps system_owner)
  if (email === "info@genericmusic.net") {
    return {
      id: user.id,
      email,
      fullName: "GMW Super Admin",
      title: "Super Administrator",
      role,
      role_level: appUser?.role_level ?? null,
      can_login: true,
    };
  }

  const fullName =
    (metadata?.full_name as string) ??
    (metadata?.name as string) ??
    email.split("@")[0] ??
    "Kullanıcı";
  const title =
    (metadata?.title as string) ??
    (metadata?.role as string) ??
    "Kullanıcı";

  return {
    id: user.id,
    email,
    fullName,
    title,
    role,
    role_level: appUser?.role_level ?? null,
    can_login: resolveCanLogin({
      can_login: appUser?.can_login,
      is_active: appUser?.is_active,
      role_level: appUser?.role_level ?? null,
    }),
  };
}
