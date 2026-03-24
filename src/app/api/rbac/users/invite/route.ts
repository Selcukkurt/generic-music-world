import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

export async function POST(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = createServerClient();
    } catch (envErr) {
      console.error("[api/rbac/users/invite] env error:", envErr);
      return NextResponse.json(
        {
          error: "Supabase konfigürasyonu eksik. NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local dosyasında tanımlanmalıdır.",
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
      /** If false, can_login stays false after invite (technical identity only). Default true when role allows. */
      initial_can_login?: boolean;
    };

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const redirectTo = `${request.nextUrl.origin}/auth/set-password`;

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email.trim(), {
        redirectTo,
        data: {},
      });

    if (inviteError) {
      console.error("[api/rbac/users/invite] invite error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const invitedUser = inviteData?.user;
    if (!invitedUser?.id) {
      return NextResponse.json({ error: "Invite failed" }, { status: 500 });
    }

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
        const { data: roleData } = await supabase
          .from("roles")
          .select("key")
          .eq("id", role_id)
          .single();
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

    return NextResponse.json({
      success: true,
      user: {
        id: invitedUser.id,
        email: invitedUser.email,
      },
    });
  } catch (err) {
    console.error("[api/rbac/users/invite] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
