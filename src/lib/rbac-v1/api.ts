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
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function fetchUsers(search?: string): Promise<AppUserWithRoles[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
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
