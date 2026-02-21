"use client";

import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Role } from "@/lib/rbac/types";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: Role;
};

/**
 * Single source of truth for current user.
 * Seed users: SYSTEM_OWNER (selcuk), CEO (ceo@genericmusic.net).
 * Replace with Supabase profiles metadata when ready.
 */
function resolveRole(email: string, metadata?: Record<string, unknown>): Role {
  const metaRole = metadata?.role as string | undefined;
  if (metaRole === "system_owner" || metaRole === "SYSTEM_OWNER") return "system_owner";
  if (metaRole === "ceo" || metaRole === "CEO") return "ceo";

  if (email === "selcuk@genericmusic.net") return "system_owner";
  if (email === "ceo@genericmusic.net") return "ceo";

  if (metaRole === "admin") return "admin";
  if (metaRole === "staff") return "staff";
  if (metaRole === "viewer") return "viewer";

  return "viewer";
}

/** Maps Supabase User to CurrentUser. Used by both getCurrentUser and useCurrentUser. */
export function mapAuthUserToCurrentUser(user: User): CurrentUser {
  const email = user.email ?? "";
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
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
    role: resolveRole(email, metadata),
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data?.user;
    if (!user) return null;
    return mapAuthUserToCurrentUser(user);
  } catch {
    return null;
  }
}
