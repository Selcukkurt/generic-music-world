import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "./env";

/**
 * Server-side Supabase client: Auth admin + RLS bypass via service role only.
 * Second argument is always process.env.SUPABASE_SERVICE_ROLE_KEY (via getSupabaseServerEnv) — never the anon key.
 */
export function createServerClient() {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  console.log("[supabase/server] SERVICE ROLE:", hasServiceRole);

  const { url, serviceRoleKey } = getSupabaseServerEnv();

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
