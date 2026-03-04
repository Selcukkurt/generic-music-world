import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(_request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const { roleId } = await params;
    const supabase = createVersionClient(user!.accessToken);

    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", roleId);

    if (error) {
      console.error("[api/rbac/roles] GET permissions error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const keys = (data ?? []).map((r) => r.permission_key);
    return NextResponse.json(keys);
  } catch (err) {
    console.error("[api/rbac/roles] GET permissions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const { roleId } = await params;
    const body = await request.json();
    const { permission_keys } = body as { permission_keys?: string[] };

    if (!Array.isArray(permission_keys)) {
      return NextResponse.json({ error: "permission_keys array is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);

    const { error: delError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (delError) {
      console.error("[api/rbac/roles] PUT permissions delete error:", delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (permission_keys.length > 0) {
      const inserts = permission_keys.map((permission_key) => ({
        role_id: roleId,
        permission_key,
      }));
      const { error: insError } = await supabase.from("role_permissions").insert(inserts);

      if (insError) {
        console.error("[api/rbac/roles] PUT permissions insert error:", insError);
        return NextResponse.json({ error: insError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rbac/roles] PUT permissions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
