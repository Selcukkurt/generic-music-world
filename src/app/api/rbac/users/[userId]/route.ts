import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { logRbacUserAction } from "@/lib/rbac/rbacAudit";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

type Lifecycle = "active" | "passive" | "archived";

async function syncLifecycleAndLogin(
  supabase: ReturnType<typeof createVersionClient>,
  userId: string,
  lifecycle: Lifecycle
) {
  let roleLevel = 6;
  const { data: au, error: selErr } = await supabase
    .from("app_users")
    .select("role_level")
    .eq("id", userId)
    .single();
  if (!selErr && typeof au?.role_level === "number") {
    roleLevel = au.role_level;
  }

  const isActive = lifecycle !== "archived";
  let canLogin = false;
  if (lifecycle === "active") {
    canLogin = roleLevel !== 5;
  }

  const payload: { is_active: boolean; can_login?: boolean } = {
    is_active: isActive,
    can_login: canLogin,
  };

  let { error: auErr } = await supabase.from("app_users").update(payload).eq("id", userId);
  if (auErr && isMissingColumnError(auErr.message, "can_login")) {
    const { can_login: _drop, ...rest } = payload;
    auErr = (await supabase.from("app_users").update(rest).eq("id", userId)).error;
  }
  if (auErr) throw new Error(auErr.message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const { userId } = await params;
    const body = await request.json();
    const { is_active, full_name, can_login, lifecycle_status } = body as {
      is_active?: boolean;
      full_name?: string;
      can_login?: boolean;
      lifecycle_status?: Lifecycle;
    };

    const supabase = createVersionClient(user!.accessToken);

    if (lifecycle_status && ["active", "passive", "archived"].includes(lifecycle_status)) {
      const { data: before } = await supabase
        .from("app_users")
        .select("is_active")
        .eq("id", userId)
        .single();
      const from: "active" | "passive" = before?.is_active === false ? "passive" : "active";
      await syncLifecycleAndLogin(supabase, userId, lifecycle_status);

      let action = "RBAC_USER_LIFECYCLE_CHANGED";
      if (from === "active" && lifecycle_status === "passive") action = "RBAC_USER_ACTIVE_TO_PASSIVE";
      else if (from === "passive" && lifecycle_status === "active") action = "RBAC_USER_PASSIVE_TO_ACTIVE";
      else if (lifecycle_status === "archived") action = "RBAC_USER_ARCHIVED";

      await logRbacUserAction(supabase, request, user!, action, userId, `${from} → ${lifecycle_status}`, {
        from,
        to: lifecycle_status,
        performing_user_id: user!.id,
        target_user_id: userId,
      });

      return NextResponse.json({ success: true });
    }

    const appUpdates: { is_active?: boolean; full_name?: string; can_login?: boolean } = {};
    if (typeof is_active === "boolean") appUpdates.is_active = is_active;
    if (typeof full_name === "string") appUpdates.full_name = full_name.trim();
    if (typeof can_login === "boolean") appUpdates.can_login = can_login;

    if (Object.keys(appUpdates).length > 0) {
      let { error } = await supabase.from("app_users").update(appUpdates).eq("id", userId);
      if (error && typeof appUpdates.can_login === "boolean" && isMissingColumnError(error.message, "can_login")) {
        const { can_login: _c, ...rest } = appUpdates;
        if (Object.keys(rest).length > 0) {
          ({ error } = await supabase.from("app_users").update(rest).eq("id", userId));
        } else {
          error = null;
        }
      }
      if (error) {
        console.error("[api/rbac/users] PATCH app_users error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: "lifecycle_status, is_active, full_name, or can_login required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rbac/users] PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
