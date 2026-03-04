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
    const { is_active } = body as { is_active?: boolean };

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);
    const { error } = await supabase
      .from("app_users")
      .update({ is_active })
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
