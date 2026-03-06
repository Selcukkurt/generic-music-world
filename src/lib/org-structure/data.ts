"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrgUnit, JobTitle, PersonAssignmentWithDetails, OrgTreeNode } from "./types";

/** Build hierarchy tree from assignments (reports_to based). Uses primary assignment per person. */
export function buildOrgTree(assignments: PersonAssignmentWithDetails[]): OrgTreeNode[] {
  const byPerson = new Map<string, PersonAssignmentWithDetails>();
  for (const a of assignments) {
    const existing = byPerson.get(a.person_id);
    if (!existing || a.is_primary) byPerson.set(a.person_id, a);
  }
  const roots = Array.from(byPerson.values()).filter((a) => !a.reports_to_person_id);
  const childrenMap = new Map<string, PersonAssignmentWithDetails[]>();
  for (const a of byPerson.values()) {
    const managerId = a.reports_to_person_id;
    if (!managerId) continue;
    const list = childrenMap.get(managerId) ?? [];
    list.push(a);
    childrenMap.set(managerId, list);
  }
  for (const list of childrenMap.values()) {
    list.sort((a, b) => (b.job_title?.rank_order ?? 0) - (a.job_title?.rank_order ?? 0));
  }
  function toNode(a: PersonAssignmentWithDetails): OrgTreeNode {
    const children = (childrenMap.get(a.person_id) ?? []).map(toNode);
    return { assignment: a, children };
  }
  roots.sort((a, b) => (b.job_title?.rank_order ?? 0) - (a.job_title?.rank_order ?? 0));
  return roots.map(toNode);
}

export async function fetchOrgUnits(): Promise<OrgUnit[]> {
  const { data, error } = await supabaseBrowser
    .from("org_units")
    .select("*")
    .eq("active", true)
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrgUnit[];
}

export async function fetchJobTitles(): Promise<JobTitle[]> {
  const { data, error } = await supabaseBrowser
    .from("job_titles")
    .select("*")
    .eq("active", true)
    .order("rank_order", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as JobTitle[];
}

export async function fetchPersonAssignments(): Promise<PersonAssignmentWithDetails[]> {
  const { data, error } = await supabaseBrowser
    .from("person_assignments")
    .select(`
      id,
      person_id,
      org_unit_id,
      job_title_id,
      reports_to_person_id,
      assignment_type,
      is_primary,
      start_date,
      end_date,
      active,
      created_at,
      updated_at,
      org_units (
        id,
        name,
        parent_id,
        module_code,
        level,
        active
      ),
      job_titles (
        id,
        name,
        category,
        rank_order
      )
    `)
    .eq("active", true)
    .order("is_primary", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const personIds = [...new Set(rows.map((r) => r.person_id as string))];
  const reportsToIds = rows
    .map((r) => r.reports_to_person_id as string)
    .filter(Boolean);
  const allPersonIds = [...new Set([...personIds, ...reportsToIds])];

  const { data: profiles } = await supabaseBrowser
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, department")
    .in("id", allPersonIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const { org_units, job_titles, ...rest } = r as Record<string, unknown>;
    const profile = profileMap.get(rest.person_id as string);
    const reportsToProfile = profileMap.get(rest.reports_to_person_id as string);

    return {
      ...rest,
      org_unit: (org_units as OrgUnit) ?? undefined,
      job_title: (job_titles as JobTitle) ?? undefined,
      person: profile
        ? { id: profile.id, full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url }
        : undefined,
      reports_to: reportsToProfile
        ? { id: reportsToProfile.id, full_name: reportsToProfile.full_name, email: reportsToProfile.email }
        : undefined,
      has_login: !!profile,
      rbac_role: profile?.role ?? undefined,
    } as PersonAssignmentWithDetails;
  });
}
