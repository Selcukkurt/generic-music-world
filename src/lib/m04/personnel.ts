"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

/** Normalized relation: Supabase returns FK relations as single object or array. */
export type JobTitleRef = { id: string; name: string } | null;
export type OrgUnitRef = { id: string; name: string } | null;

/** Raw response from Supabase - relations may be object or array depending on query. */
type PersonnelRow = {
  id: string;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  iban: string | null;
  insurance_status: "insured" | "freelance";
  salary_type: "monthly" | "daily" | "freelance";
  salary_amount: number | null;
  compensation_type?: "salary" | "daily_rate";
  salary_monthly?: number | null;
  daily_rate?: number | null;
  rbac_role: string | null;
  job_title_id: string | null;
  org_unit_id: string | null;
  reports_to_person_id?: string | null;
  status: "active" | "inactive" | "blacklist";
  is_active?: boolean;
  notes: string | null;
  documents?: unknown[];
  created_at: string;
  updated_at: string;
  job_titles?: unknown;
  org_units?: unknown;
};

function toRelation(val: unknown): { id: string; name: string } | null {
  if (val == null) return null;
  if (Array.isArray(val)) {
    const first = val[0];
    return first && typeof first === "object" && "id" in first && "name" in first
      ? { id: String(first.id), name: String(first.name) }
      : null;
  }
  if (typeof val === "object" && val !== null && "id" in val && "name" in val) {
    return { id: String((val as { id: unknown }).id), name: String((val as { name: unknown }).name) };
  }
  return null;
}

function toPersonnelRecord(row: PersonnelRow): PersonnelRecord {
  const { job_titles: _jt, org_units: _ou, ...rest } = row;
  const job = toRelation(row.job_titles);
  const org = toRelation(row.org_units);
  return {
    ...rest,
    job_titles: job ?? undefined,
    org_units: org ?? undefined,
  };
}

export type PersonnelRecord = {
  id: string;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  iban: string | null;
  insurance_status: "insured" | "freelance";
  salary_type: "monthly" | "daily" | "freelance";
  salary_amount: number | null;
  compensation_type?: "salary" | "daily_rate";
  salary_monthly?: number | null;
  daily_rate?: number | null;
  rbac_role: string | null;
  job_title_id: string | null;
  org_unit_id: string | null;
  reports_to_person_id?: string | null;
  status: "active" | "inactive" | "blacklist";
  is_active?: boolean;
  notes: string | null;
  documents?: unknown[];
  created_at: string;
  updated_at: string;
  job_titles?: JobTitleRef;
  org_units?: OrgUnitRef;
};

export type PersonnelFilters = {
  search?: string;
  insurance_status?: "insured" | "freelance" | "all";
  status?: "active" | "inactive" | "all";
  blacklist?: boolean | "all";
  page?: number;
  pageSize?: number;
};

export type PersonnelListResult = {
  data: PersonnelRecord[];
  total: number;
  page: number;
  pageSize: number;
};

function buildFullName(r: PersonnelRecord): string {
  if (r.full_name?.trim()) return r.full_name.trim();
  const first = r.first_name?.trim() ?? "";
  const last = r.last_name?.trim() ?? "";
  return [first, last].filter(Boolean).join(" ") || "—";
}

export function getFullName(record: PersonnelRecord): string {
  return buildFullName(record);
}

export async function fetchPersonnelById(id: string): Promise<PersonnelRecord | null> {
  const { data, error } = await supabaseBrowser
    .from("personnel")
    .select(
      `
      id,
      profile_id,
      first_name,
      last_name,
      full_name,
      email,
      phone,
      national_id,
      iban,
      insurance_status,
      salary_type,
      salary_amount,
      compensation_type,
      salary_monthly,
      daily_rate,
      rbac_role,
      job_title_id,
      org_unit_id,
      status,
      is_active,
      notes,
      documents,
      created_at,
      updated_at,
      job_titles (id, name),
      org_units (id, name)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toPersonnelRecord(data as PersonnelRow);
}

export async function fetchPersonnel(filters: PersonnelFilters): Promise<PersonnelListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;

  let query = supabaseBrowser
    .from("personnel")
    .select(
      `
      id,
      profile_id,
      first_name,
      last_name,
      full_name,
      email,
      phone,
      national_id,
      iban,
      insurance_status,
      salary_type,
      salary_amount,
      compensation_type,
      salary_monthly,
      daily_rate,
      rbac_role,
      job_title_id,
      org_unit_id,
      status,
      is_active,
      notes,
      documents,
      created_at,
      updated_at,
      job_titles (id, name),
      org_units (id, name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    query = query.or(
      `first_name.ilike.${q},last_name.ilike.${q},full_name.ilike.${q},email.ilike.${q},national_id.ilike.${q},phone.ilike.${q}`
    );
  }
  if (filters.insurance_status && filters.insurance_status !== "all") {
    query = query.eq("insurance_status", filters.insurance_status);
  }
  if (filters.blacklist === true) {
    query = query.eq("status", "blacklist");
  } else if (filters.blacklist === false) {
    query = query.neq("status", "blacklist");
  } else if (filters.status === "active") {
    query = query.eq("status", "active");
  } else if (filters.status === "inactive") {
    query = query.eq("status", "inactive");
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as PersonnelRow[]).map(toPersonnelRecord);
  return {
    data: rows,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export type CreatePersonnelPayload = {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  national_id?: string;
  iban?: string;
  insurance_status: "insured" | "freelance";
  salary_type: "monthly" | "daily" | "freelance";
  salary_amount?: number;
  rbac_role?: string;
  job_title_id?: string;
  org_unit_id?: string;
  notes?: string;
  documents?: Array<{ name: string; url?: string; type?: string }>;
};

export async function createPersonnel(payload: CreatePersonnelPayload): Promise<PersonnelRecord> {
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || firstName || "Unknown";

  const insertPayload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName || null,
    full_name: fullName,
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    national_id: payload.national_id?.trim() || null,
    iban: payload.iban?.trim() || null,
    insurance_status: payload.insurance_status,
    salary_type: payload.salary_type,
    salary_amount: payload.salary_amount ?? null,
    rbac_role: payload.rbac_role?.trim() || "staff",
    job_title_id: payload.job_title_id || null,
    org_unit_id: payload.org_unit_id || null,
    notes: payload.notes?.trim() || null,
    documents: payload.documents ?? [],
    status: "active",
  };
  if (payload.salary_type === "monthly" && payload.salary_amount != null) {
    insertPayload.compensation_type = "salary";
    insertPayload.salary_monthly = payload.salary_amount;
  } else if (payload.salary_type === "daily" && payload.salary_amount != null) {
    insertPayload.compensation_type = "daily_rate";
    insertPayload.daily_rate = payload.salary_amount;
  }

  const { data, error } = await supabaseBrowser
    .from("personnel")
    .insert(insertPayload)
    .select(
      `
      *,
      job_titles (id, name),
      org_units (id, name)
    `
    )
    .single();

  if (error) throw new Error(error.message);
  return toPersonnelRecord(data as PersonnelRow);
}

export type UpdatePersonnelPayload = Partial<Omit<CreatePersonnelPayload, "notes">> & {
  status?: "active" | "inactive" | "blacklist";
  notes?: string | null;
};

export async function updatePersonnel(id: string, payload: UpdatePersonnelPayload): Promise<void> {
  const cleanPayload: Record<string, unknown> = { ...payload };
  if ("notes" in payload) cleanPayload.notes = payload.notes ?? null;
  const { error } = await supabaseBrowser.from("personnel").update(cleanPayload).eq("id", id);
  if (error) throw new Error(error.message);
}

export type PersonnelEventAssignment = {
  id: string;
  personnel_id: string;
  event_id: string;
  job_title_id: string;
  assignment_type: "primary" | "acting";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  etkinlik_events?: { id: string; name: string; date: string; venue?: string | null } | null;
  job_titles?: { id: string; name: string } | null;
};

export async function fetchPersonnelEventAssignments(personnelId: string): Promise<PersonnelEventAssignment[]> {
  const { data, error } = await supabaseBrowser
    .from("event_assignments")
    .select(`
      id,
      personnel_id,
      event_id,
      job_title_id,
      assignment_type,
      start_date,
      end_date,
      created_at,
      updated_at,
      etkinlik_events (id, name, date, venue),
      job_titles (id, name)
    `)
    .eq("personnel_id", personnelId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const ev = r.etkinlik_events;
    const jt = r.job_titles;
    return {
      ...r,
      etkinlik_events: Array.isArray(ev) ? ev[0] ?? null : ev ?? null,
      job_titles: Array.isArray(jt) ? jt[0] ?? null : jt ?? null,
    } as PersonnelEventAssignment;
  });
}

export type PersonnelDocument = {
  id: string;
  personnel_id: string;
  name: string;
  file_url: string | null;
  doc_type: string | null;
  created_at: string;
};

export async function fetchPersonnelDocuments(personnelId: string): Promise<PersonnelDocument[]> {
  const { data, error } = await supabaseBrowser
    .from("personnel_documents")
    .select("id, personnel_id, name, file_url, doc_type, created_at")
    .eq("personnel_id", personnelId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PersonnelDocument[];
}

export async function fetchReportsToPersonnel(personnelId: string): Promise<PersonnelRecord | null> {
  const { data } = await supabaseBrowser
    .from("personnel")
    .select("id, first_name, last_name, full_name, email")
    .eq("id", personnelId)
    .single();
  if (!data) return null;
  return { ...data, job_titles: null, org_units: null } as PersonnelRecord;
}

export type SicilRecord = PersonnelRecord & {
  event_count: number;
  avg_rating: number | null;
  latest_feedback: string | null;
  risk_status: "ok" | "warning" | "blacklist";
};

export async function fetchPersonnelForSicil(filters: {
  search?: string;
  status?: "active" | "inactive" | "all";
  blacklist?: boolean | "all";
}): Promise<SicilRecord[]> {
  const blacklistFilter = filters.blacklist === "all" || filters.blacklist === undefined ? undefined : filters.blacklist;
  const result = await fetchPersonnel({
    search: filters.search,
    status: filters.status ?? "all",
    blacklist: blacklistFilter,
    page: 1,
    pageSize: 500,
  });
  const eventCounts = new Map<string, number>();
  const { data: counts } = await supabaseBrowser
    .from("event_assignments")
    .select("personnel_id");
  for (const row of counts ?? []) {
    const pid = (row as { personnel_id: string }).personnel_id;
    eventCounts.set(pid, (eventCounts.get(pid) ?? 0) + 1);
  }
  return result.data.map((r) => ({
    ...r,
    event_count: eventCounts.get(r.id) ?? 0,
    avg_rating: null,
    latest_feedback: null,
    risk_status: (r.status === "blacklist" ? "blacklist" : "ok") as SicilRecord["risk_status"],
  }));
}
