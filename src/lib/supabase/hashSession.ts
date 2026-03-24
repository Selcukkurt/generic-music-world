"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Values Supabase puts in the URL hash for implicit / invite / magic-link redirects. */
export type ParsedOAuthHash = {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_description?: string;
};

export function parseOAuthHashFragment(hash: string): ParsedOAuthHash | null {
  if (!hash || hash === "#") return null;
  const q = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(q);
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
    type: params.get("type") ?? undefined,
    error: params.get("error") ?? undefined,
    error_description: params.get("error_description") ?? undefined,
  };
}

/**
 * If `window.location.hash` contains OAuth tokens (invite / implicit flow), call
 * `setSession` and strip the hash from the URL. PKCE (`?code=`) is handled separately.
 *
 * Returns `established: true` when a session was created from the hash.
 * Returns `established: false` when there is no hash or no tokens (caller may use `getSession()`).
 * Returns `error` when the hash indicates an OAuth error or `setSession` failed.
 */
export async function establishSessionFromUrlHashIfPresent(
  supabase: SupabaseClient
): Promise<{ established: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { established: false };
  }
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return { established: false };
  }
  const parsed = parseOAuthHashFragment(hash);
  if (!parsed) {
    return { established: false };
  }
  if (parsed.error) {
    return {
      established: false,
      error: parsed.error_description?.replace(/\+/g, " ") || parsed.error,
    };
  }
  if (!parsed.access_token || !parsed.refresh_token) {
    return { established: false };
  }

  const { error } = await supabase.auth.setSession({
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
  });
  if (error) {
    return { established: false, error: error.message };
  }

  const path = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", path);
  return { established: true };
}
