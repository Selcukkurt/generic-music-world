"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAppUserForAuth } from "@/lib/auth/fetchAppUserForAuth";
import type { AppUserLoginRow } from "@/lib/auth/mapAuthUser";
import { mapAuthUserToCurrentUser } from "@/lib/auth/mapAuthUser";
import { getAccessRedirect } from "@/lib/auth/accessRedirect";

/** Short TTL so route changes / HMR do not each trigger a full app_users refetch storm. */
const APP_USER_CACHE_TTL_MS = 5000;

/**
 * Loads app_users + enforces access_phase / lifecycle redirects.
 * Main app layout: initial loader until first check; subsequent navigations re-check without resetting loader.
 */
export function useAccessGate(): { isChecking: boolean } {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const appUserCacheRef = useRef<{
    userId: string;
    row: AppUserLoginRow | null;
    fetchedAt: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!data.user) {
        appUserCacheRef.current = null;
        if (!cancelled) router.replace("/login");
        return;
      }

      const uid = data.user.id;
      const now = Date.now();
      const cached = appUserCacheRef.current;
      let appUser: AppUserLoginRow | null;
      if (
        cached &&
        cached.userId === uid &&
        now - cached.fetchedAt < APP_USER_CACHE_TTL_MS
      ) {
        appUser = cached.row;
      } else {
        appUser = await fetchAppUserForAuth(supabaseBrowser, uid);
        appUserCacheRef.current = { userId: uid, row: appUser, fetchedAt: Date.now() };
      }

      const user = mapAuthUserToCurrentUser(data.user, appUser ?? undefined);
      const redirect = getAccessRedirect(pathname, user);
      if (cancelled) return;
      if (redirect) {
        router.replace(redirect);
        return;
      }
      setIsChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return { isChecking };
}
