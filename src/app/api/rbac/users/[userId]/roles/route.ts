import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";
import { logRbacUserAction } from "@/lib/rbac/rbacAudit";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { role_ids } = body as { role_ids?: string[] };

    if (!Array.isArray(role_ids)) {
      return NextResponse.json({ error: "role_ids array is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);

    const { data: lifeRow } = await supabase
      .from("app_users")
      .select("is_active")
      .eq("id", userId)
      .single();

    const { data: ownerRole } = await supabase
      .from("roles")
      .select("id")
      .eq("key", "owner")
      .single();

    const isAssigningOwner = ownerRole && role_ids.includes(ownerRole.id);

    if (isAssigningOwner && ownerRole) {
      const { error: removeOwnerError } = await supabase
        .from("user_roles")
        .delete()
        .eq("role_id", ownerRole.id)
        .neq("user_id", userId);

      if (removeOwnerError) {
        console.error("[api/rbac/users] PUT roles remove-owner error:", removeOwnerError);
        return NextResponse.json({ error: removeOwnerError.message }, { status: 500 });
      }
    }

    const { error: delError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (delError) {
      console.error("[api/rbac/users] PUT roles delete error:", delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (role_ids.length > 0) {
      const inserts = role_ids.map((role_id) => ({ user_id: userId, role_id }));
      const { error: insError } = await supabase.from("user_roles").insert(inserts);

      if (insError) {
        console.error("[api/rbac/users] PUT roles insert error:", insError);
        return NextResponse.json({ error: insError.message }, { status: 500 });
      }
    }

    const primaryRoleId = role_ids[0];
    let roleKey = "viewer";
    if (primaryRoleId) {
      const { data: primaryRole } = await supabase
        .from("roles")
        .select("key")
        .eq("id", primaryRoleId)
        .single();
      if (primaryRole?.key) roleKey = (primaryRole.key as string).toLowerCase();
    }
    const roleLevel = LEGACY_ROLE_TO_LEVEL[roleKey] ?? 6;
    let canLogin = roleLevel !== 5;
    if (lifeRow?.is_active === false) {
      canLogin = false;
    }

    const full = { role: roleKey, role_level: roleLevel, can_login: canLogin };
    let { error: auErr } = await supabase.from("app_users").update(full).eq("id", userId);

    if (auErr) {
      if (isMissingColumnError(auErr.message, "can_login")) {
        const { can_login: _c, ...rest } = full;
        ({ error: auErr } = await supabase.from("app_users").update(rest).eq("id", userId));
      }
      if (auErr && (isMissingColumnError(auErr.message, "role") || isMissingColumnError(auErr.message, "role_level"))) {
        ({ error: auErr } = await supabase.from("app_users").update({ can_login: full.can_login }).eq("id", userId));
      }
      if (auErr) {
        console.warn("[api/rbac/users] PUT roles app_users sync (non-fatal):", auErr.message);
      }
    }

    await logRbacUserAction(supabase, request, user!, "RBAC_USER_ROLES_UPDATED", userId, `role_level=${roleLevel}`, {
      role_key: roleKey,
      role_level: roleLevel,
      target_user_id: userId,
      performing_user_id: user!.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rbac/users] PUT roles error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
