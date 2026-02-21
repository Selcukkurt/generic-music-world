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
 * Mocked role resolution – replace with Supabase profiles metadata when ready.
 */
function resolveRole(email: string): Role {
  if (email === "selcuk@genericmusic.net") return "owner";
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
    role: resolveRole(email),
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
