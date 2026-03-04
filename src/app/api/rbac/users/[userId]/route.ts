import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";

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
    const { is_active, full_name } = body as { is_active?: boolean; full_name?: string };

    const updates: { is_active?: boolean; full_name?: string } = {};
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (typeof full_name === "string") updates.full_name = full_name.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "is_active or full_name required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);
    const { error } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("[api/rbac/users] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
