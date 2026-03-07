"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrgUnit, OrgUnitWithDetails, JobTitle, PersonAssignmentWithDetails, OrgTreeNode, OrgUnitTreeNode } from "./types";

/** Fetch org units with parent and manager for table display. */
export async function fetchOrgUnitsWithDetails(): Promise<OrgUnitWithDetails[]> {
  const { data, error } = await supabaseBrowser
    .from("org_units")
    .select("*")
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as Array<OrgUnit & { manager_id?: string }>;
  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))] as string[];
  const managerIds = [...new Set(rows.map((r) => r.manager_id).filter(Boolean))] as string[];

  const [parentsRes, managersRes] = await Promise.all([
    parentIds.length ? supabaseBrowser.from("org_units").select("id, name").in("id", parentIds) : { data: [] },
    managerIds.length ? supabaseBrowser.from("personnel").select("id, first_name, last_name, full_name").in("id", managerIds) : { data: [] },
  ]);
  const parentMap = new Map((parentsRes.data ?? []).map((p) => [p.id, { id: p.id, name: p.name }]));
  const managerMap = new Map(
    (managersRes.data ?? []).map((m) => [
      m.id,
      { id: m.id, full_name: m.full_name ?? ([m.first_name, m.last_name].filter(Boolean).join(" ") || null) },
    ])
  );

  return rows.map((r) => ({
    ...r,
    parent: r.parent_id ? parentMap.get(r.parent_id) ?? null : null,
    manager: r.manager_id ? managerMap.get(r.manager_id) ?? null : null,
  })) as OrgUnitWithDetails[];
}

export type CreateOrgUnitInput = {
  name: string;
  parent_id?: string | null;
  module_code?: string | null;
  level?: number;
  active?: boolean;
  manager_id?: string | null;
};

export type UpdateOrgUnitInput = Partial<CreateOrgUnitInput>;

export async function createOrgUnit(input: CreateOrgUnitInput): Promise<OrgUnit> {
  let level = input.level ?? 0;
  if (input.parent_id) {
    const { data: parent } = await supabaseBrowser
      .from("org_units")
      .select("level")
      .eq("id", input.parent_id)
      .single();
    if (parent) level = (parent as { level: number }).level + 1;
  }
  const { data, error } = await supabaseBrowser
    .from("org_units")
    .insert({
      name: input.name.trim(),
      parent_id: input.parent_id ?? null,
      module_code: input.module_code ?? null,
      level,
      active: input.active ?? true,
      manager_id: input.manager_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OrgUnit;
}

export async function updateOrgUnit(id: string, input: UpdateOrgUnitInput): Promise<OrgUnit> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id;
  if (input.module_code !== undefined) payload.module_code = input.module_code;
  if (input.level !== undefined) payload.level = input.level;
  if (input.active !== undefined) payload.active = input.active;
  if (input.manager_id !== undefined) payload.manager_id = input.manager_id;
  if (Object.keys(payload).length === 0) {
    const { data } = await supabaseBrowser.from("org_units").select("*").eq("id", id).single();
    if (!data) throw new Error("Org unit not found");
    return data as OrgUnit;
  }
  const { data, error } = await supabaseBrowser
    .from("org_units")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OrgUnit;
}

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

/** Build hierarchy tree from org_units (parent_id). Enriches each node with primary assignment. */
export function buildOrgTreeFromUnits(
  units: OrgUnit[],
  assignments: PersonAssignmentWithDetails[]
): OrgUnitTreeNode[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const primaryByUnit = new Map<string, PersonAssignmentWithDetails>();
  for (const a of assignments) {
    const existing = primaryByUnit.get(a.org_unit_id);
    if (!existing || a.is_primary) primaryByUnit.set(a.org_unit_id, a);
  }
  const childrenMap = new Map<string, OrgUnit[]>();
  for (const u of units) {
    const pid = u.parent_id ?? "__root__";
    const list = childrenMap.get(pid) ?? [];
    list.push(u);
    childrenMap.set(pid, list);
  }
  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  function toNode(unit: OrgUnit): OrgUnitTreeNode {
    const children = (childrenMap.get(unit.id) ?? []).map(toNode);
    return {
      unit,
      primaryAssignment: primaryByUnit.get(unit.id) ?? null,
      children,
    };
  }
  const roots = childrenMap.get("__root__") ?? [];
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

export type VekaletPosition = {
  org_unit_id: string;
  org_unit_name: string;
  job_title_id: string;
  job_title_name: string;
  primary_person: { id: string; full_name: string | null } | null;
  acting_person: string | null;
  status: "filled" | "vacant" | "acting";
};

const ACTING_FALLBACK = "Vekaleten: Selcuk Kurt (CEO)";

/** Fetch positions for Vekalet Paneli: job_title + org_unit with primary/acting. */
export async function fetchVekaletPositions(): Promise<VekaletPosition[]> {
  const [assigns, units, jobTitles] = await Promise.all([
    fetchPersonAssignments(),
    fetchOrgUnits(),
    fetchJobTitles(),
  ]);
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const byPosition = new Map<string, PersonAssignmentWithDetails[]>();
  for (const a of assigns) {
    const key = `${a.org_unit_id}:${a.job_title_id}`;
    const list = byPosition.get(key) ?? [];
    list.push(a);
    byPosition.set(key, list);
  }

  const positionKeys = new Set<string>();

  for (const a of assigns) {
    positionKeys.add(`${a.org_unit_id}:${a.job_title_id}`);
  }
  for (const jt of jobTitles) {
    if (jt.org_unit_id) positionKeys.add(`${jt.org_unit_id}:${jt.id}`);
  }

  const positions: VekaletPosition[] = [];

  for (const key of positionKeys) {
    const [orgUnitId, jobTitleId] = key.split(":");
    const list = byPosition.get(key) ?? [];
    const primary = list.find((x) => x.is_primary) ?? list[0];
    const unit = unitMap.get(orgUnitId);
    const jobTitle = jobTitles.find((j) => j.id === jobTitleId) ?? list[0]?.job_title;

    const orgUnitName = unit?.name ?? list[0]?.org_unit?.name ?? "—";
    const jobTitleName = jobTitle?.name ?? list[0]?.job_title?.name ?? "—";

    if (primary?.person) {
      positions.push({
        org_unit_id: orgUnitId,
        org_unit_name: orgUnitName,
        job_title_id: jobTitleId,
        job_title_name: jobTitleName,
        primary_person: { id: primary.person!.id, full_name: primary.person!.full_name },
        acting_person: null,
        status: "filled",
      });
    } else {
      positions.push({
        org_unit_id: orgUnitId,
        org_unit_name: orgUnitName,
        job_title_id: jobTitleId,
        job_title_name: jobTitleName,
        primary_person: null,
        acting_person: ACTING_FALLBACK,
        status: "vacant",
      });
    }
  }

  positions.sort((a, b) => a.org_unit_name.localeCompare(b.org_unit_name) || a.job_title_name.localeCompare(b.job_title_name));
  return positions;
}
