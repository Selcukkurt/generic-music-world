import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";

export async function PUT(
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
    const { role_ids } = body as { role_ids?: string[] };

    if (!Array.isArray(role_ids)) {
      return NextResponse.json({ error: "role_ids array is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rbac/users] PUT roles error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
