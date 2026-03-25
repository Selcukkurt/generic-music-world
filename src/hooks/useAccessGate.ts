"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAppUserForAuth } from "@/lib/auth/fetchAppUserForAuth";
import { mapAuthUserToCurrentUser } from "@/lib/auth/mapAuthUser";
import { getAccessRedirect } from "@/lib/auth/accessRedirect";

/**
 * Loads app_users + enforces access_phase / lifecycle redirects.
 * Main app layout: initial loader until first check; subsequent navigations re-check without resetting loader.
 */
export function useAccessGate(): { isChecking: boolean } {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!data.user) {
        if (!cancelled) router.replace("/login");
        return;
      }

      const appUser = await fetchAppUserForAuth(supabaseBrowser, data.user.id);
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
