/**
 * Centralized Supabase environment handling.
 * Validates required env vars and fails fast with clear errors.
 *
 * - Client code: use getSupabaseClientEnv() only (NEXT_PUBLIC_* vars).
 * - Server code: use getSupabaseServerEnv() for service-role operations.
 * - Never import getSupabaseServerEnv from client-side code.
 */

const CLIENT_MSG =
  "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required. Set them in Vercel Environment Variables or .env.local.";

const SERVER_MSG =
  "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server. Set them in Vercel Environment Variables or .env.local.";

/** Client-safe env: URL + anon key only. Use in client components and API routes that use anon key. */
export function getSupabaseClientEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(CLIENT_MSG);
  }
  return { url, anonKey };
}

/** Server-only env: URL + service role key. Use only in API routes / server code. Never expose to client. */
export function getSupabaseServerEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(SERVER_MSG);
  }
  return { url, serviceRoleKey };
}
