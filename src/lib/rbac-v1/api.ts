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
    if (process.env.NODE_ENV === "development") {
      // One line — avoid dumping large `body` objects (DevTools + terminal spam during RBAC issues).
      console.warn(
        `[rbac-v1/api] ${options?.method ?? "GET"} /api/rbac${path} → ${res.status}`,
        code ?? "",
        msg
      );
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin${path}`, {
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
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[rbac-v1/api] ${options?.method ?? "GET"} /api/admin${path} → ${res.status}`,
        code ?? "",
        msg
      );
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export type FetchUsersFilters = {
  include_archived?: boolean;
  invited_only?: boolean;
  can_login?: boolean | null;
  /** Filter by `lifecycle_status` (active | passive | archived). */
  lifecycle?: string | null;
  /** Filter by `app_users.access_phase` (e.g. awaiting_activation). */
  access_phase?: string | null;
  role_level?: number | null;
};

export async function fetchUsers(
  search?: string,
  active?: boolean | null,
  filters?: FetchUsersFilters
): Promise<AppUserWithRoles[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (active === true) params.set("active", "true");
  if (active === false) params.set("active", "false");
  if (filters?.include_archived) params.set("include_archived", "true");
  if (filters?.invited_only) params.set("invited_only", "true");
  if (filters?.can_login === true) params.set("can_login", "true");
  if (filters?.can_login === false) params.set("can_login", "false");
  if (filters?.lifecycle) params.set("lifecycle", filters.lifecycle);
  if (filters?.access_phase) params.set("access_phase", filters.access_phase);
  if (filters?.role_level != null && !Number.isNaN(filters.role_level)) {
    params.set("role_level", String(filters.role_level));
  }
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

export type InviteUserResult = {
  success: boolean;
  user: { id: string; email: string | null };
  /** false when email was not sent (fallback path). */
  inviteSent?: boolean;
  /** Present when e-posta could not be sent; admin should share this URL manually. */
  manualInviteLink?: string | null;
};

export async function inviteUser(params: {
  email: string;
  role_id: string;
  first_name: string;
  last_name: string;
  initial_can_login?: boolean;
}): Promise<InviteUserResult> {
  return rbacFetch<InviteUserResult>("/users/invite", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function resendUserInvite(userId: string): Promise<InviteUserResult> {
  return rbacFetch<InviteUserResult>(`/users/${userId}/resend-invite`, {
    method: "POST",
  });
}

export async function fetchUserInviteLink(userId: string): Promise<{ manualInviteLink: string | null }> {
  return rbacFetch<{ manualInviteLink: string | null }>(`/users/${userId}/invite-link`, {
    method: "POST",
  });
}

export async function requestUserPasswordResetLink(userId: string): Promise<{ manualResetLink: string | null }> {
  return rbacFetch<{ manualResetLink: string | null }>(`/users/${userId}/password-reset`, {
    method: "POST",
  });
}

export async function permanentDeleteUser(
  userId: string,
  body: { confirmEmail: string; reason?: string }
): Promise<{ success: boolean; deletedUserId: string; deletedEmail: string }> {
  return rbacFetch(`/users/${userId}/permanent-delete`, {
    method: "POST",
    body: JSON.stringify(body),
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

export type PersonnelCandidate = { id: string; full_name: string | null; email: string | null };

export async function fetchPersonnelCandidates(): Promise<PersonnelCandidate[]> {
  return adminFetch<PersonnelCandidate[]>("/personnel-candidates");
}

export async function activateUserWithPersonnel(body: {
  user_id: string;
  personnel_id: string;
  role_id: string;
  title?: string;
  department?: string;
}): Promise<{ ok?: boolean; alreadyActive?: boolean; access_phase?: string; hub_pipeline_phase?: string }> {
  return adminFetch("/users/activate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
