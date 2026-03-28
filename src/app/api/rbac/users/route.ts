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
  lifecycle_status,
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
  access_phase,
  hub_pipeline_phase,
  hub_access_granted_at,
  lifecycle_status,
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

/** Prefer DB `lifecycle_status`; fallback for legacy rows. */
function deriveLifecycleStatus(r: Record<string, unknown>): "active" | "passive" | "archived" {
  const col = r.lifecycle_status;
  if (col === "active" || col === "passive" || col === "archived") return col;
  return r.is_active === false ? "passive" : "active";
}

function deriveLifecycleDisplay(
  life: "active" | "passive" | "archived",
  lastLogin: string | null
): "invited" | "active" | "passive" | "archived" {
  if (life === "archived") return "archived";
  if (life === "passive") return "passive";
  if (!lastLogin) return "invited";
  return "active";
}

function deriveInvitePipeline(
  emailConfirmed: string | null | undefined,
  lastLogin: string | null
): "email_pending" | "onboarding" | "complete" {
  if (!emailConfirmed) return "email_pending";
  if (!lastLogin) return "onboarding";
  return "complete";
}

function applyUserListFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  sp: URLSearchParams,
  opts?: { skipLifecycleColumn?: boolean; skipAccessPhaseColumn?: boolean }
) {
  const search = sp.get("search")?.trim();
  const activeParam = sp.get("active");
  const lifecycleParam = sp.get("lifecycle")?.trim();
  const accessPhaseParam = sp.get("access_phase")?.trim();
  const unlinkedOnly = sp.get("unlinked") === "true";
  const includeArchived = sp.get("include_archived") === "true";
  const canLoginParam = sp.get("can_login");

  if (search) {
    q = q.or(`email.ilike.%${search}%`);
  }
  if (activeParam === "true") {
    q = q.eq("is_active", true);
  } else if (activeParam === "false") {
    q = q.eq("is_active", false);
  }

  if (!opts?.skipLifecycleColumn) {
    if (lifecycleParam && ["active", "passive", "archived"].includes(lifecycleParam)) {
      q = q.eq("lifecycle_status", lifecycleParam);
    } else if (!includeArchived) {
      // Include legacy rows where lifecycle_status is still NULL (pre-migration / backfill gaps).
      q = q.or("lifecycle_status.eq.active,lifecycle_status.eq.passive,lifecycle_status.is.null");
    }
  }

  if (accessPhaseParam && !opts?.skipAccessPhaseColumn) {
    q = q.eq("access_phase", accessPhaseParam);
  }

  if (canLoginParam === "true") {
    q = q.eq("can_login", true);
  } else if (canLoginParam === "false") {
    q = q.eq("can_login", false);
  }

  return { q, unlinkedOnly };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireOwnerOrAdmin(user);
    if (forbidden) return forbidden;

    /** List uses the caller JWT (anon + RLS). Rows must be visible under RLS policies on app_users — see migration `can_read_rbac_user_directory` (COO + owner/admin roles). */
    const supabase = createVersionClient(user!.accessToken);
    const sp = request.nextUrl.searchParams;
    const roleLevelParam = sp.get("role_level");

    let q = supabase
      .from("app_users")
      .select(EXTENDED_SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const filtered = applyUserListFilters(q, sp);
    q = filtered.q;

    let rows: Record<string, unknown>[] | null = null;
    let usedLifecycleFallback = false;

    let first = await q;
    if (first.error && /deleted_at/i.test(first.error.message ?? "")) {
      let qNoDel = supabase.from("app_users").select(EXTENDED_SELECT).order("created_at", { ascending: false });
      qNoDel = applyUserListFilters(qNoDel, sp).q;
      first = await qNoDel;
    }
    if (first.error) {
      const msg = first.error.message ?? "";
      const retry =
        /column|does not exist|schema cache|could not find|unknown column/i.test(msg);
      if (retry) {
        let q2 = supabase
          .from("app_users")
          .select(MINIMAL_SELECT)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        q2 = applyUserListFilters(q2, sp, { skipLifecycleColumn: true, skipAccessPhaseColumn: true }).q;
        let second = await q2;
        if (second.error && /deleted_at/i.test(second.error.message ?? "")) {
          let q3 = supabase.from("app_users").select(MINIMAL_SELECT).order("created_at", { ascending: false });
          q3 = applyUserListFilters(q3, sp, { skipLifecycleColumn: true, skipAccessPhaseColumn: true }).q;
          second = await q3;
        }
        if (second.error) {
          console.error("[api/rbac/users] GET app_users error (fallback failed):", second.error);
          return NextResponse.json(
            { error: second.error.message, code: "APP_USERS_QUERY" },
            { status: 500 }
          );
        }
        rows = (second.data ?? []) as Record<string, unknown>[];
        usedLifecycleFallback = true;
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

    const personnelByProfile: Record<string, { id: string; display_name: string }> = {};
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

    const lastLoginById: Record<string, string | null> = {};
    const emailConfirmedById: Record<string, string | null> = {};
    try {
      const admin = createServerClient();
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of authData?.users ?? []) {
        lastLoginById[u.id] = u.last_sign_in_at ?? null;
        emailConfirmedById[u.id] = u.email_confirmed_at ?? null;
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
      const lastLogin = lastLoginById[r.id as string] ?? null;
      const emailConfirmed = emailConfirmedById[r.id as string] ?? null;
      const lifecycle_display = deriveLifecycleDisplay(life, lastLogin);
      const invite_pipeline = deriveInvitePipeline(emailConfirmed, lastLogin);

      return {
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        is_active: r.is_active,
        lifecycle_status: life,
        lifecycle_display,
        invite_pipeline,
        email_confirmed_at: emailConfirmed,
        created_at: r.created_at,
        updated_at: r.updated_at,
        roles: roleList,
        role_code,
        role_level: roleLevel,
        can_login,
        linked_personnel_id: personnelByProfile[r.id as string]?.id ?? null,
        linked_personnel_name: personnelByProfile[r.id as string]?.display_name ?? null,
        last_login_at: lastLogin,
        access_phase: (r.access_phase as string | null | undefined) ?? null,
        hub_pipeline_phase: (r.hub_pipeline_phase as string | null | undefined) ?? null,
        hub_access_granted_at: (r.hub_access_granted_at as string | null | undefined) ?? null,
      };
    });

    const includeArchived = sp.get("include_archived") === "true";
    const lifecycleParam = sp.get("lifecycle")?.trim();
    if (usedLifecycleFallback) {
      if (lifecycleParam && ["active", "passive", "archived"].includes(lifecycleParam)) {
        users = users.filter((u) => u.lifecycle_status === lifecycleParam);
      } else if (!includeArchived) {
        users = users.filter((u) => u.lifecycle_status !== "archived");
      }
    }

    if (sp.get("invited_only") === "true") {
      users = users.filter((u) => !u.last_login_at && u.lifecycle_status !== "archived");
    }

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
