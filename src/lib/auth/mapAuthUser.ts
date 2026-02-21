import type { User } from "@supabase/supabase-js";
import type { Role } from "@/lib/rbac/types";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: Role;
};

function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "system_owner" || lower === "system owner") return "system_owner";
  if (lower === "ceo") return "ceo";
  if (lower === "admin") return "admin";
  if (lower === "staff") return "staff";
  if (lower === "viewer") return "viewer";
  return null;
}

/** Fallback when profile.role is missing (dev/legacy). */
function resolveRoleFallback(email: string, metadata?: Record<string, unknown>): Role {
  const metaRole = metadata?.role as string | undefined;
  const parsed = parseRole(metaRole);
  if (parsed) return parsed;

  if (email === "info@genericmusic.net") return "system_owner";
  if (email === "selcuk@genericmusic.net") return "ceo";

  return "viewer";
}

/** Maps Supabase User + optional profile.role to CurrentUser. Pure function, server-safe. */
export function mapAuthUserToCurrentUser(
  user: User,
  profileRole?: string | null
): CurrentUser {
  const email = user.email ?? "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const role =
    parseRole(profileRole) ?? resolveRoleFallback(email, metadata);

  // info@genericmusic.net: fixed display name and title (keeps system_owner)
  if (email === "info@genericmusic.net") {
    return {
      id: user.id,
      email,
      fullName: "GMW Super Admin",
      title: "Super Administrator",
      role,
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
  };
}
