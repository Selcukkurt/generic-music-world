"use client";

import { useEffect } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { invalidateAppUserClientCache } from "@/lib/auth/fetchAppUserForAuth";
import { invalidateMeApiTokenCache } from "@/lib/me/meApiSession";

/**
 * Clears short-lived client caches when auth state changes so we never reuse a stale
 * bearer token or app_users row after sign-in, sign-out, or token refresh.
 */
export default function AuthCacheInvalidation() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      invalidateMeApiTokenCache();
      // Clear all profile rows: user switch, token refresh, and sign-out must not leave stale RBAC identity.
      invalidateAppUserClientCache();
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
