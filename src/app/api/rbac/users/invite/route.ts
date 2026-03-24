import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getInviteRedirectOrigin } from "@/lib/supabase/env";
import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

function serializeAuthError(err: unknown): string {
  if (err == null) return String(err);
  if (typeof err !== "object") return String(err);
  try {
    const o = err as Record<string, unknown>;
    const keys = Object.getOwnPropertyNames(err);
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      try {
        out[k] = o[k];
      } catch {
        out[k] = "[unserializable]";
      }
    }
    return JSON.stringify(out);
  } catch {
    return String(err);
  }
}

/** Best-effort classification for operators (check server logs). Not exposed to clients. */
function logInviteFailureHint(message: string | undefined) {
  const m = (message || "").toLowerCase();
  let hint =
    "check Supabase logs + Dashboard (Authentication → Email/SMTP, URL Configuration, Email Templates → Invite user)";
  if (m.includes("smtp") || m.includes("mail") || m.includes("send") || m.includes("email") || m.includes("535") || m.includes("554")) {
    hint = "likely_email_smtp_or_provider_rejection";
  } else if (
    m.includes("redirect") ||
    m.includes("not allowed") ||
    (m.includes("invalid") && (m.includes("uri") || m.includes("url"))) ||
    (m.includes("url") && (m.includes("mismatch") || m.includes("allow")))
  ) {
    hint = "likely_redirect_or_site_url_mismatch_add_exact_url_to_supabase_redirect_urls";
  } else if (m.includes("template")) {
    hint = "likely_email_template";
  } else if (m.includes("rate") || m.includes("too many")) {
    hint = "likely_rate_limit";
  }
  console.error("[api/rbac/users/invite] failure_hint:", hint);
}

function logAuthErr(context: string, err: unknown) {
  const e = err as { message?: string; status?: number; code?: string; name?: string };
  console.error(`[api/rbac/users/invite] ${context} (full):`, serializeAuthError(err));
  console.error(`[api/rbac/users/invite] ${context} (summary):`, {
    message: e?.message,
    status: e?.status,
    code: e?.code,
    name: e?.name,
  });
  logInviteFailureHint(e?.message);
}

/** Generic copy for clients; details stay in server logs only. */
const GENERIC_INVITE_FAIL =
  "Kullanıcı oluşturulamadı. Lütfen daha sonra tekrar deneyin veya yöneticiye başvurun.";

async function syncRolesAndAppUsers(
  supabase: ReturnType<typeof createServerClient>,
  invitedUser: User,
  role_id: string | undefined,
  initial_can_login: boolean | undefined
) {
  let roleLevel = 6;
  let canLogin = true;
  let roleKey = "viewer";

  if (role_id && typeof role_id === "string") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: invitedUser.id, role_id }, { onConflict: "user_id,role_id" });

    if (roleError) {
      console.error("[api/rbac/users/invite] role assign error:", roleError);
    } else {
      const { data: roleData } = await supabase.from("roles").select("key").eq("id", role_id).single();
      if (roleData?.key) {
        roleKey = (roleData.key as string).toLowerCase();
        roleLevel = LEGACY_ROLE_TO_LEVEL[roleKey] ?? 6;
        canLogin = roleLevel !== 5;
      }
    }
  }

  if (initial_can_login === false) {
    canLogin = false;
  }

  const full = { role: roleKey, role_level: roleLevel, can_login: canLogin };
  let { error: auErr } = await supabase.from("app_users").update(full).eq("id", invitedUser.id);

  if (auErr) {
    if (isMissingColumnError(auErr.message, "can_login")) {
      const { can_login: _c, ...rest } = full;
      ({ error: auErr } = await supabase.from("app_users").update(rest).eq("id", invitedUser.id));
    }
    if (auErr && (isMissingColumnError(auErr.message, "role") || isMissingColumnError(auErr.message, "role_level"))) {
      ({ error: auErr } = await supabase.from("app_users").update({ can_login: full.can_login }).eq("id", invitedUser.id));
    }
    if (auErr) {
      console.warn("[api/rbac/users/invite] app_users sync (non-fatal):", auErr.message);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = createServerClient();
    } catch (envErr) {
      console.error("[api/rbac/users/invite] Supabase server env missing or invalid:", envErr);
      return NextResponse.json(
        {
          error:
            "Davet e-postası şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin veya yöneticiye başvurun.",
        },
        { status: 503 }
      );
    }

    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { email, role_id, initial_can_login } = body as {
      email?: string;
      role_id?: string;
      initial_can_login?: boolean;
    };

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const trimmed = email.trim();
    const origin = getInviteRedirectOrigin(request.nextUrl.origin);
    const redirectTo = `${origin}/auth/callback`;
    console.info("[api/rbac/users/invite] using redirectTo (must match Supabase Auth redirect allowlist):", redirectTo);

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(trimmed, {
      redirectTo,
      data: {},
    });

    let invitedUser: User | null = inviteData?.user ?? null;
    let inviteSent = !inviteError;
    let manualInviteLink: string | null = null;

    if (inviteError) {
      logAuthErr("inviteUserByEmail failed", inviteError);

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: trimmed,
        email_confirm: false,
      });

      if (createErr) {
        console.error(
          "[api/rbac/users/invite] auth.admin.createUser — full Supabase error (service role required; check logs above for SERVICE ROLE):",
          serializeAuthError(createErr)
        );
        logAuthErr("auth.admin.createUser failed", createErr);
      } else if (created?.user) {
        invitedUser = created.user;
      }

      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "invite",
        email: trimmed,
        options: { redirectTo },
      });

      if (linkErr) {
        logAuthErr("admin.generateLink failed", linkErr);
        if (!invitedUser?.id) {
          return NextResponse.json({ error: GENERIC_INVITE_FAIL }, { status: 400 });
        }
      } else {
        const props = linkData as { properties?: { action_link?: string }; user?: User } | null;
        manualInviteLink = props?.properties?.action_link ?? null;
        if (!invitedUser && props?.user) {
          invitedUser = props.user;
        }
      }

      inviteSent = false;

      if (!invitedUser?.id) {
        return NextResponse.json({ error: GENERIC_INVITE_FAIL }, { status: 400 });
      }
    }

    if (!invitedUser?.id) {
      return NextResponse.json({ error: GENERIC_INVITE_FAIL }, { status: 500 });
    }

    await syncRolesAndAppUsers(supabase, invitedUser, role_id, initial_can_login);

    return NextResponse.json({
      success: true,
      inviteSent,
      manualInviteLink,
      user: {
        id: invitedUser.id,
        email: invitedUser.email,
      },
    });
  } catch (err) {
    console.error("[api/rbac/users/invite] unhandled (full):", serializeAuthError(err));
    logInviteFailureHint(err instanceof Error ? err.message : undefined);
    return NextResponse.json({ error: GENERIC_INVITE_FAIL }, { status: 500 });
  }
}
