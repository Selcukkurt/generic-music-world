"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

const TOKEN_CACHE_MS = 4000;

let tokenCache: { value: string | null; at: number } | null = null;

/**
 * Returns the current access token, coalescing concurrent callers and avoiding
 * repeated `getSession()` within TOKEN_CACHE_MS (burst navigation / sequential meApiFetch).
 * Invalidated on auth state changes (`AuthCacheInvalidation`) and `signOut` so tokens never go stale.
 */
export function getBearerTokenForMeApi(): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && now - tokenCache.at < TOKEN_CACHE_MS) {
    return Promise.resolve(tokenCache.value);
  }

  return supabaseBrowser.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token ?? null;
    tokenCache = { value: token, at: Date.now() };
    return token;
  });
}

/** Call after `signOut` so the next request does not reuse a cached bearer token. */
export function invalidateMeApiTokenCache(): void {
  tokenCache = null;
}
