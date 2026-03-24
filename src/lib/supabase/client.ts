"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClientEnv } from "./env";

/**
 * Lazy singleton so `next build` / prerender does not require Supabase env at module evaluation.
 * Env is read on first real use (e.g. `supabaseBrowser.auth.getSession()`).
 */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const { url, anonKey } = getSupabaseClientEnv();
    _client = createClient(url, anonKey);
  }
  return _client;
}

export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop as keyof SupabaseClient);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(c);
    }
    return value;
  },
});
