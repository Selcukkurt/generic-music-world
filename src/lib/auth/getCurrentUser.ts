"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAppUserForAuth } from "./fetchAppUserForAuth";
import { mapAuthUserToCurrentUser, type CurrentUser } from "./mapAuthUser";
import type { Role } from "@/lib/rbac/types";

export type { CurrentUser };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data?.user;
    if (!user) return null;

    const appUser = await fetchAppUserForAuth(supabaseBrowser, user.id);

    return mapAuthUserToCurrentUser(user, appUser ?? undefined);
  } catch {
    return null;
  }
}

/** Returns post-login redirect path based on role. SYSTEM_OWNER → /system, others → /dashboard. */
export function getPostLoginRedirectPath(role: Role): string {
  return role === "system_owner" ? "/system" : "/dashboard";
}
