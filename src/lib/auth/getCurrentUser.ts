"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Role } from "@/lib/rbac/types";

export type CurrentUser = {
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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data?.user;
    if (!user) return null;

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
      email,
      fullName,
      title,
      role: resolveRole(email),
    };
  } catch {
    return null;
  }
}
