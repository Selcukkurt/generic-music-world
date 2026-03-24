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
  "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required for server. Set them in Vercel Environment Variables or .env.local.";

/** Client-safe env: URL + anon key only. Use in client components and API routes that use anon key. */
export function getSupabaseClientEnv(): { url: string; anonKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) {
    throw new Error(CLIENT_MSG);
  }
  return { url, anonKey };
}

/**
 * Server-only env: project URL + service role key (admin API, invite, etc.).
 * URL: NEXT_PUBLIC_SUPABASE_URL first, then SUPABASE_URL (common server-only duplicate).
 * Uses process.env.SUPABASE_SERVICE_ROLE_KEY only — never NEXT_PUBLIC_SUPABASE_ANON_KEY for admin.
 */
export function getSupabaseServerEnv(): { url: string; serviceRoleKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const rawSr = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKey = (rawSr || "").trim();

  if (!url || !serviceRoleKey) {
    console.error("[supabase/env] Server credentials missing — admin Auth/DB will fail:", {
      hasProjectUrl: Boolean(url),
      hasServiceRoleKey: Boolean(rawSr?.trim()),
      urlSource: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "NEXT_PUBLIC_SUPABASE_URL"
        : process.env.SUPABASE_URL
          ? "SUPABASE_URL"
          : "none",
    });
    throw new Error(SERVER_MSG);
  }

  if (!serviceRoleKey.startsWith("eyJ")) {
    console.error(
      "[supabase/env] SUPABASE_SERVICE_ROLE_KEY does not look like a JWT. Use the service_role secret from Supabase Dashboard → Settings → API (not the anon key)."
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Canonical browser origin for Auth redirects (invite → /auth/callback). Must match
 * Supabase Dashboard → Authentication → URL Configuration (Site URL + Redirect URLs) exactly.
 * Prefer NEXT_PUBLIC_SITE_URL in .env.local for dev, e.g. http://localhost:3005 (avoids 127.0.0.1 vs localhost mismatch).
 */
export function getInviteRedirectOrigin(requestOrigin: string): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.INVITE_APP_ORIGIN ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  const fallback = requestOrigin.trim().replace(/\/$/, "");
  return fromEnv || fallback;
}
