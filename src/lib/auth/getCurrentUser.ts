"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { mapAuthUserToCurrentUser, type CurrentUser } from "./mapAuthUser";
import type { Role } from "@/lib/rbac/types";

export type { CurrentUser };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data?.user;
    if (!user) return null;

    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return mapAuthUserToCurrentUser(user, profile?.role);
  } catch {
    return null;
  }
}

/** Returns post-login redirect path based on role. SYSTEM_OWNER → /system, others → /dashboard. */
export function getPostLoginRedirectPath(role: Role): string {
  return role === "system_owner" ? "/system" : "/dashboard";
}
