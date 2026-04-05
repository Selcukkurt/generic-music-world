import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Resend } from "resend";

import { fetchAppUserForAuth } from "@/lib/auth/fetchAppUserForAuth";
import { mapAuthUserToCurrentUser } from "@/lib/auth/mapAuthUser";
import { getSupabaseClientEnv } from "@/lib/supabase/env";

/**
 * Temporary local-only: GET /api/test-email
 * Reads session from cookies (@supabase/ssr, same as logged-in browser).
 * Sends one Resend message to the current user's email. Does not touch NDA/onboarding mail.
 */
export async function GET() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseClientEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore read-only cookie store */
        }
      },
    },
  });

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUser = await fetchAppUserForAuth(supabase, authUser.id);
  const current = mapAuthUserToCurrentUser(authUser, appUser ?? undefined);
  const to = current.email?.trim();
  if (!to) {
    return NextResponse.json({ error: "Authenticated user has no email" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? process.env.RESEND_FROM;
  if (!apiKey || !fromAddress) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set" },
      { status: 500 }
    );
  }

  const from = `Generic Music World <${fromAddress}>`;
  const resend = new Resend(apiKey);
  const { error: mailError } = await resend.emails.send({
    from,
    to,
    subject: "Test email (GMW)",
    html: "<p>This is a test message from the Generic Music World API.</p>",
  });

  if (mailError) {
    return NextResponse.json({ error: mailError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to });
}
