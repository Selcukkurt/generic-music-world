import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const activeParam = request.nextUrl.searchParams.get("active");

    let query = supabase
      .from("app_users")
      .select(`
        id,
        email,
        full_name,
        is_active,
        created_at,
        updated_at,
        user_roles (
          roles (
            id,
            key,
            name_tr,
            description_tr,
            is_system
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    if (activeParam === "true") {
      query = query.eq("is_active", true);
    } else if (activeParam === "false") {
      query = query.eq("is_active", false);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("[api/rbac/users] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (rows ?? []).map((r: Record<string, unknown>) => {
      const ur = (r.user_roles as Array<{ roles: Record<string, unknown> | null }>) ?? [];
      const roles = ur.map((x) => x.roles).filter(Boolean) as Record<string, unknown>[];
      return {
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        roles,
      };
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("[api/rbac/users] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
