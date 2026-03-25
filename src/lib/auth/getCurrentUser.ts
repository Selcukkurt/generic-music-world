"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAppUserForAuth } from "./fetchAppUserForAuth";
import { mapAuthUserToCurrentUser, type CurrentUser } from "./mapAuthUser";
import { getPostHubAuthPath } from "./hubPipeline";

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

/** Post-login / post-invite destination from Hub pipeline + legacy access_phase. */
export function getPostLoginRedirectPath(user: CurrentUser): string {
  return getPostHubAuthPath({ role: user.role, u: user });
}
