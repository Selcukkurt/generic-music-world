import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";

/** Returns permission keys for the current user (from user_roles + role_permissions). */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // System owner has all permissions
    if (user.role === "system_owner") {
      return NextResponse.json(["*"]);
    }

    const supabase = createVersionClient(user.accessToken);
    const { data: userRoles, error: urError } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);

    if (urError || !userRoles?.length) {
      return NextResponse.json([]);
    }

    const roleIds = userRoles.map((r) => r.role_id);
    const { data: rolePerms, error: rpError } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .in("role_id", roleIds);

    if (rpError) {
      return NextResponse.json([]);
    }

    const keys = [...new Set((rolePerms ?? []).map((p) => p.permission_key))];
    return NextResponse.json(keys);
  } catch (err) {
    console.error("[api/rbac/me/permissions] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
