import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const { data, error } = await supabase
      .from("permissions")
      .select("key, group, description_tr")
      .order("group")
      .order("key");

    if (error) {
      console.error("[api/rbac/permissions] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[api/rbac/permissions] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
