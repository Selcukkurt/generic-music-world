import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { email, full_name, role_id } = body as {
      email?: string;
      full_name?: string;
      role_id?: string;
    };

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email.trim(), {
        data: { full_name: full_name?.trim() ?? "" },
      });

    if (inviteError) {
      console.error("[api/rbac/users/invite] invite error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const invitedUser = inviteData?.user;
    if (!invitedUser?.id) {
      return NextResponse.json({ error: "Invite failed" }, { status: 500 });
    }

    if (role_id && typeof role_id === "string") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: invitedUser.id, role_id }, { onConflict: "user_id,role_id" });

      if (roleError) {
        console.error("[api/rbac/users/invite] role assign error:", roleError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: invitedUser.id,
        email: invitedUser.email,
        full_name: full_name?.trim() ?? null,
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
