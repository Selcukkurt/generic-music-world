"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { AppUser, AppUserWithRoles, Role, Permission } from "./types";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function rbacFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rbac${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers } as HeadersInit,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: string; code?: string }).error ??
      res.statusText ??
      "Request failed";
    const code = (body as { code?: string }).code;
    console.error("[rbac-v1/api]", options?.method ?? "GET", `/api/rbac${path}`, res.status, code ?? "", msg, body);
    throw new Error(code ? `${msg} (${code})` : msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchUsers(
  search?: string,
  active?: boolean | null
): Promise<AppUserWithRoles[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (active === true) params.set("active", "true");
  if (active === false) params.set("active", "false");
  const q = params.toString() ? `?${params.toString()}` : "";
  return rbacFetch<AppUserWithRoles[]>(`/users${q}`);
}

export async function fetchRoles(): Promise<Role[]> {
  return rbacFetch<Role[]>("/roles");
}

export async function fetchPermissions(): Promise<Permission[]> {
  return rbacFetch<Permission[]>("/permissions");
}

export async function updateUserActive(userId: string, isActive: boolean): Promise<void> {
  await rbacFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function updateUser(
  userId: string,
  data: { full_name?: string; is_active?: boolean; can_login?: boolean }
): Promise<void> {
  await rbacFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** System owner: lifecycle transitions (e.g. restore from archived). */
export async function updateUserLifecycle(
  userId: string,
  lifecycle: "active" | "passive" | "archived"
): Promise<void> {
  await rbacFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ lifecycle_status: lifecycle }),
  });
}

export async function inviteUser(params: {
  email: string;
  role_id?: string;
}): Promise<{ success: boolean; user: { id: string; email: string | null } }> {
  return rbacFetch<{ success: boolean; user: { id: string; email: string | null } }>(
    "/users/invite",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
}

export async function assignUserRoles(userId: string, roleIds: string[]): Promise<void> {
  await rbacFetch(`/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ role_ids: roleIds }),
  });
}

export async function updateRolePermissions(roleId: string, permissionKeys: string[]): Promise<void> {
  await rbacFetch(`/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_keys: permissionKeys }),
  });
}

export async function fetchMyPermissions(): Promise<string[]> {
  return rbacFetch<string[]>("/me/permissions");
}

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
  return rbacFetch<string[]>(`/roles/${roleId}/permissions`);
}

export type EventAccessEntry = {
  event_id: string;
  profile_id: string;
  access_level: "view" | "edit";
  event?: { id: string; name: string; date: string; venue?: string; status?: string } | null;
};

export async function fetchUserEventAccess(userId: string): Promise<EventAccessEntry[]> {
  return rbacFetch<EventAccessEntry[]>(`/users/${userId}/event-access`);
}

export async function updateUserEventAccess(
  userId: string,
  entries: Array<{ event_id: string; access_level: "view" | "edit" }>
): Promise<void> {
  await rbacFetch(`/users/${userId}/event-access`, {
    method: "PUT",
    body: JSON.stringify({ entries }),
  });
}
