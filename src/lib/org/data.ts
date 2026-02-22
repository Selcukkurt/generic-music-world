"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrgDepartment, OrgTeam, OrgSettings } from "./types";

export async function fetchDepartments(): Promise<OrgDepartment[]> {
  const { data, error } = await supabaseBrowser
    .from("org_departments")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrgDepartment[];
}

export async function fetchTeams(departmentId?: string | null): Promise<OrgTeam[]> {
  let query = supabaseBrowser
    .from("org_teams")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgTeam[];
}

export async function fetchOrgSettings(): Promise<OrgSettings | null> {
  const { data, error } = await supabaseBrowser
    .from("org_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as OrgSettings;
}

export async function ensureOrgSettings(): Promise<OrgSettings> {
  const existing = await fetchOrgSettings();
  if (existing) return existing;

  const { data, error } = await supabaseBrowser
    .from("org_settings")
    .insert({ id: 1, default_role: "staff" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OrgSettings;
}

export async function createDepartment(name: string): Promise<OrgDepartment> {
  const { data, error } = await supabaseBrowser
    .from("org_departments")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OrgDepartment;
}

export async function updateDepartment(
  id: string,
  payload: Partial<Pick<OrgDepartment, "name" | "is_active" | "sort_order">>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("org_departments")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("org_departments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function createTeam(
  name: string,
  departmentId?: string | null
): Promise<OrgTeam> {
  const { data, error } = await supabaseBrowser
    .from("org_teams")
    .insert({
      name: name.trim(),
      department_id: departmentId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OrgTeam;
}

export async function updateTeam(
  id: string,
  payload: Partial<Pick<OrgTeam, "name" | "department_id" | "is_active" | "sort_order">>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("org_teams")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("org_teams")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updateOrgSettings(
  payload: Partial<Pick<OrgSettings, "default_role" | "default_department_id" | "default_team_id" | "require_approval_for_role_change">>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("org_settings")
    .update(payload)
    .eq("id", 1);

  if (error) throw new Error(error.message);
}
