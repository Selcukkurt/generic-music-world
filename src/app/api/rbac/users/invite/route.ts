import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getInviteRedirectOrigin } from "@/lib/supabase/env";
import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";

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

type InviteIdentity = {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
};

async function syncRolesAndAppUsers(
  supabase: ReturnType<typeof createServerClient>,
  invitedUser: User,
  role_id: string,
  initial_can_login: boolean | undefined,
  identity: InviteIdentity
) {
  let roleLevel = 6;
  let canLogin = true;
  let roleKey = "viewer";

  const rid = role_id.trim();
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: invitedUser.id, role_id: rid }, { onConflict: "user_id,role_id" });

  if (roleError) {
    console.error("[api/rbac/users/invite] role assign error:", roleError);
  } else {
    const { data: roleData } = await supabase.from("roles").select("key").eq("id", rid).single();
    if (roleData?.key) {
      roleKey = (roleData.key as string).toLowerCase();
      roleLevel = LEGACY_ROLE_TO_LEVEL[roleKey] ?? 6;
      canLogin = roleLevel !== 5;
    }
  }

  if (initial_can_login === false) {
    canLogin = false;
  }

  const rbac = { role: roleKey, role_level: roleLevel, can_login: canLogin };
  /** New accounts start in product onboarding (invited DB default is superseded here when columns exist). */
  const funnel = { access_phase: "onboarding" as const, hub_pipeline_phase: "onboarding" as const };
  const withNames = {
    first_name: identity.first_name,
    last_name: identity.last_name,
    full_name: identity.full_name,
    email: identity.email,
    ...rbac,
    ...funnel,
  };
  const withEmail = { email: identity.email, full_name: identity.full_name, ...rbac, ...funnel };
  const withNamesNoFunnel = {
    first_name: identity.first_name,
    last_name: identity.last_name,
    full_name: identity.full_name,
    email: identity.email,
    ...rbac,
  };
  const withEmailNoFunnel = { email: identity.email, full_name: identity.full_name, ...rbac };

  const payloads: Record<string, unknown>[] = [
    withNames,
    withNamesNoFunnel,
    withEmail,
    withEmailNoFunnel,
    { full_name: identity.full_name, ...rbac, ...funnel },
    { full_name: identity.full_name, ...rbac },
    rbac,
    { can_login: rbac.can_login },
  ];

  let lastErr: { message: string } | null = null;
  for (const payload of payloads) {
    const { error } = await supabase.from("app_users").update(payload).eq("id", invitedUser.id);
    if (!error) {
      lastErr = null;
      break;
    }
    lastErr = error;
    const msg = error.message ?? "";
    const retryable =
      isPostgrestSchemaError(msg) ||
      isMissingColumnError(msg, "first_name") ||
      isMissingColumnError(msg, "last_name") ||
      isMissingColumnError(msg, "full_name") ||
      isMissingColumnError(msg, "email") ||
      isMissingColumnError(msg, "role") ||
      isMissingColumnError(msg, "role_level") ||
      isMissingColumnError(msg, "can_login") ||
      isMissingColumnError(msg, "access_phase") ||
      isMissingColumnError(msg, "hub_pipeline_phase");
    if (!retryable) break;
  }

  if (lastErr) {
    console.warn("[api/rbac/users/invite] app_users sync (non-fatal):", lastErr.message);
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
    const { email, role_id, initial_can_login, first_name, last_name } = body as {
      email?: string;
      role_id?: string;
      initial_can_login?: boolean;
      first_name?: string;
      last_name?: string;
    };

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const firstName = typeof first_name === "string" ? first_name.trim() : "";
    const lastName = typeof last_name === "string" ? last_name.trim() : "";
    if (!firstName) {
      return NextResponse.json({ error: "first_name is required" }, { status: 400 });
    }
    if (!lastName) {
      return NextResponse.json({ error: "last_name is required" }, { status: 400 });
    }

    if (!role_id || typeof role_id !== "string" || !role_id.trim()) {
      return NextResponse.json({ error: "role_id is required" }, { status: 400 });
    }

    const trimmed = email.trim();
    const fullName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();
    const identity: InviteIdentity = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: trimmed,
    };

    const authIdentityPayload = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
    };
    const origin = getInviteRedirectOrigin(request.nextUrl.origin);
    const redirectTo = `${origin}/auth/callback`;
    console.info("[api/rbac/users/invite] using redirectTo (must match Supabase Auth redirect allowlist):", redirectTo);

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(trimmed, {
      redirectTo,
      data: authIdentityPayload,
    });

    let invitedUser: User | null = inviteData?.user ?? null;
    let inviteSent = !inviteError;
    let manualInviteLink: string | null = null;

    if (inviteError) {
      logAuthErr("inviteUserByEmail failed", inviteError);

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: trimmed,
        email_confirm: false,
        user_metadata: authIdentityPayload,
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

    try {
      const prevMeta = (invitedUser.user_metadata ?? {}) as Record<string, unknown>;
      const { error: metaErr } = await supabase.auth.admin.updateUserById(invitedUser.id, {
        user_metadata: { ...prevMeta, ...authIdentityPayload },
      });
      if (metaErr) {
        console.warn("[api/rbac/users/invite] user_metadata merge (non-fatal):", metaErr.message);
      }
    } catch (metaEx) {
      console.warn("[api/rbac/users/invite] user_metadata merge threw:", metaEx);
    }

    await syncRolesAndAppUsers(supabase, invitedUser, role_id, initial_can_login, identity);

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
