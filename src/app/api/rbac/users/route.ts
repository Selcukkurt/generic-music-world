import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireOwnerOrAdmin, createVersionClient } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { resolveCanLogin } from "@/lib/rbac/canLoginPolicy";
import { primaryRoleKeyFromUserRoles, resolveRoleLevelFromUserRoles } from "@/lib/rbac/appUsersDerive";

const MINIMAL_SELECT = `
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
`;

const EXTENDED_SELECT = `
  id,
  email,
  full_name,
  is_active,
  can_login,
  role,
  role_level,
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
`;

/** Status for UI; no lifecycle_status column required — derive from is_active. */
function deriveLifecycleStatus(r: Record<string, unknown>): "active" | "passive" | "archived" {
  const col = r.lifecycle_status;
  if (col === "active" || col === "passive" || col === "archived") return col;
  return r.is_active === false ? "passive" : "active";
}

function applyUserListFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  sp: URLSearchParams
) {
  const search = sp.get("search")?.trim();
  const activeParam = sp.get("active");
  const lifecycleParam = sp.get("lifecycle")?.trim();
  const unlinkedOnly = sp.get("unlinked") === "true";

  if (search) {
    q = q.or(`email.ilike.%${search}%`);
  }
  if (activeParam === "true") {
    q = q.eq("is_active", true);
  } else if (activeParam === "false") {
    q = q.eq("is_active", false);
  }

  if (lifecycleParam && ["active", "passive", "archived"].includes(lifecycleParam)) {
    if (lifecycleParam === "active") {
      q = q.eq("is_active", true);
    } else {
      q = q.eq("is_active", false);
    }
  }

  return { q, unlinkedOnly };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireOwnerOrAdmin(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const sp = request.nextUrl.searchParams;
    const roleLevelParam = sp.get("role_level");

    let q = supabase.from("app_users").select(EXTENDED_SELECT).order("created_at", { ascending: false });
    const filtered = applyUserListFilters(q, sp);
    q = filtered.q;

    let rows: Record<string, unknown>[] | null = null;

    const first = await q;
    if (first.error) {
      const msg = first.error.message ?? "";
      const retry =
        /column|does not exist|schema cache|could not find|unknown column/i.test(msg);
      if (retry) {
        let q2 = supabase.from("app_users").select(MINIMAL_SELECT).order("created_at", { ascending: false });
        q2 = applyUserListFilters(q2, sp).q;
        const second = await q2;
        if (second.error) {
          console.error("[api/rbac/users] GET app_users error (fallback failed):", second.error);
          return NextResponse.json(
            { error: second.error.message, code: "APP_USERS_QUERY" },
            { status: 500 }
          );
        }
        rows = (second.data ?? []) as Record<string, unknown>[];
      } else {
        console.error("[api/rbac/users] GET app_users error:", JSON.stringify(first.error), first.error.message);
        return NextResponse.json(
          { error: first.error.message, code: "APP_USERS_QUERY" },
          { status: 500 }
        );
      }
    } else {
      rows = (first.data ?? []) as Record<string, unknown>[];
    }

    const userIds = (rows ?? []).map((r) => r.id as string);

    let personnelByProfile: Record<string, { id: string; display_name: string }> = {};
    if (userIds.length > 0) {
      const { data: personnelRows, error: personnelError } = await supabase
        .from("personnel")
        .select("id, profile_id, first_name, last_name, full_name")
        .in("profile_id", userIds);
      if (personnelError) {
        console.error("[api/rbac/users] GET personnel error (non-fatal):", personnelError);
      }
      for (const row of personnelRows ?? []) {
        const pr = row as Record<string, unknown>;
        const pid = pr.profile_id as string;
        const fn = (pr.first_name as string) ?? "";
        const ln = (pr.last_name as string) ?? "";
        const full = (pr.full_name as string)?.trim();
        const display = full || [fn, ln].filter(Boolean).join(" ").trim() || "—";
        personnelByProfile[pid] = { id: pr.id as string, display_name: display };
      }
    }

    let lastLoginById: Record<string, string | null> = {};
    try {
      const admin = createServerClient();
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of authData?.users ?? []) {
        lastLoginById[u.id] = u.last_sign_in_at ?? null;
      }
    } catch (e) {
      console.warn("[api/rbac/users] last_login from auth (non-fatal):", e);
    }

    let users = (rows ?? []).map((r: Record<string, unknown>) => {
      const ur = (r.user_roles as Array<{ roles: Record<string, unknown> | null }>) ?? [];
      const roleList = ur.map((x) => x.roles).filter(Boolean) as Record<string, unknown>[];
      const joinLevel = resolveRoleLevelFromUserRoles(ur);
      const joinKey = primaryRoleKeyFromUserRoles(ur);
      const roleLevel =
        typeof r.role_level === "number" && !Number.isNaN(r.role_level) ? (r.role_level as number) : joinLevel;
      const role_code =
        typeof r.role === "string" && r.role.length > 0 ? (r.role as string) : joinKey;

      const can_login = resolveCanLogin({
        can_login: r.can_login as boolean | null | undefined,
        is_active: r.is_active as boolean | null | undefined,
        role_level: roleLevel,
      });

      const life = deriveLifecycleStatus(r);
      return {
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        is_active: r.is_active,
        lifecycle_status: life,
        created_at: r.created_at,
        updated_at: r.updated_at,
        roles: roleList,
        role_code,
        role_level: roleLevel,
        can_login,
        linked_personnel_id: personnelByProfile[r.id as string]?.id ?? null,
        linked_personnel_name: personnelByProfile[r.id as string]?.display_name ?? null,
        last_login_at: lastLoginById[r.id as string] ?? null,
      };
    });

    if (roleLevelParam !== null && roleLevelParam !== undefined && roleLevelParam !== "") {
      const want = Number(roleLevelParam);
      if (!Number.isNaN(want)) {
        users = users.filter((u) => u.role_level === want);
      }
    }

    if (filtered.unlinkedOnly) {
      users = users.filter((u) => !u.linked_personnel_id);
    }

    return NextResponse.json(users);
  } catch (err) {
    console.error("[api/rbac/users] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
