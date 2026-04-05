"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClientEnv } from "./env";

/**
 * Lazy singleton so `next build` / prerender does not require Supabase env at module evaluation.
 * Uses @supabase/ssr so the session is stored in cookies and server routes (e.g. GET /api/*) can read it.
 */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const { url, anonKey } = getSupabaseClientEnv();
    _client = createBrowserClient(url, anonKey);
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
