import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "./env";

/** Server-side Supabase client with service role. Use only in API routes / server code. */
export function createServerClient() {
  const { url, serviceRoleKey } = getSupabaseServerEnv();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
