import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAuthUserToCurrentUser } from "@/lib/auth/mapAuthUser";

export type ApiUser = { id: string; email?: string; role: string; accessToken: string };

/** Return 401 JSON (no throw). */
function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Verify auth from request. Uses Bearer token from Authorization header. Never throws. */
export async function getApiUser(
  request: NextRequest
): Promise<{ user: ApiUser; error: null } | { user: null; error: NextResponse }> {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return { user: null, error: unauthorized() };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return { user: null, error: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
    }

    const supabase = createClient(url, anonKey);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return { user: null, error: unauthorized() };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    const currentUser = mapAuthUserToCurrentUser(authUser, profile?.role);
    return {
      user: { id: currentUser.id, email: currentUser.email, role: currentUser.role, accessToken: token },
      error: null,
    };
  } catch (err) {
    console.error("[version/api-auth] getApiUser error:", err);
    return {
      user: null,
      error: NextResponse.json(
        { error: err instanceof Error ? err.message : "Auth failed" },
        { status: 500 }
      ),
    };
  }
}

/** Create Supabase client with user token (anon key). No service role required. */
export function createVersionClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("[version/api-auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    throw new Error("Server misconfigured: missing Supabase env vars");
  }
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/** Require system_owner for write operations. Returns 403 JSON if not. */
export function requireSystemOwner(user: ApiUser | null): NextResponse | null {
  if (!user) return unauthorized();
  if (user.role !== "system_owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
