"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

/** Event assignment - separate from RBAC and Job Title */
export type EventAssignment = {
  id: string;
  personnel_id: string;
  event_id: string;
  job_title_id: string;
  assignment_type: "primary" | "acting";
  start_date: string | null;
  end_date: string | null;
  status?: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type EventAssignmentWithDetails = EventAssignment & {
  etkinlik_events?: { id: string; name: string; date: string; venue?: string | null } | null;
  job_titles?: { id: string; name: string; org_unit_id?: string | null } | null;
  org_units?: { id: string; name: string } | null;
  personnel?: { id: string; first_name: string | null; last_name: string | null; full_name?: string | null } | null;
};

export type CreateEventAssignmentPayload = {
  personnel_id: string;
  event_id: string;
  job_title_id: string;
  assignment_type?: "primary" | "acting";
  start_date?: string | null;
  end_date?: string | null;
  status?: "active" | "completed" | "cancelled";
};

export type UpdateEventAssignmentPayload = Partial<CreateEventAssignmentPayload>;

function getPersonName(p: { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null | undefined): string {
  if (!p) return "—";
  if (p.full_name?.trim()) return p.full_name.trim();
  const first = p.first_name?.trim() ?? "";
  const last = p.last_name?.trim() ?? "";
  return [first, last].filter(Boolean).join(" ") || "—";
}

export async function fetchEventAssignments(filters?: {
  search?: string;
  status?: "active" | "completed" | "cancelled" | "all";
  event_id?: string;
}): Promise<EventAssignmentWithDetails[]> {
  let query = supabaseBrowser
    .from("event_assignments")
    .select(`
      id,
      personnel_id,
      event_id,
      job_title_id,
      assignment_type,
      start_date,
      end_date,
      status,
      created_at,
      updated_at,
      etkinlik_events (id, name, date, venue),
      job_titles (id, name, org_unit_id),
      personnel (id, first_name, last_name, full_name)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.event_id) {
    query = query.eq("event_id", filters.event_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const orgUnitIds = [...new Set(rows.map((r) => (r.job_titles as { org_unit_id?: string } | null)?.org_unit_id).filter(Boolean))] as string[];

  let orgMap = new Map<string, { id: string; name: string }>();
  if (orgUnitIds.length > 0) {
    const { data: orgs } = await supabaseBrowser.from("org_units").select("id, name").in("id", orgUnitIds);
    orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));
  }

  return rows.map((r) => {
    const jt = Array.isArray(r.job_titles) ? r.job_titles[0] : r.job_titles;
    const ev = Array.isArray(r.etkinlik_events) ? r.etkinlik_events[0] : r.etkinlik_events;
    const pers = Array.isArray(r.personnel) ? r.personnel[0] : r.personnel;
    const orgId = (jt as { org_unit_id?: string } | null)?.org_unit_id;
    return {
      ...r,
      etkinlik_events: ev ?? null,
      job_titles: jt ?? null,
      org_units: orgId ? orgMap.get(orgId) ?? null : null,
      personnel: pers ?? null,
    } as EventAssignmentWithDetails;
  });
}

export async function createEventAssignment(payload: CreateEventAssignmentPayload): Promise<EventAssignment> {
  const { data, error } = await supabaseBrowser
    .from("event_assignments")
    .insert({
      personnel_id: payload.personnel_id,
      event_id: payload.event_id,
      job_title_id: payload.job_title_id,
      assignment_type: payload.assignment_type ?? "primary",
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      status: payload.status ?? "active",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EventAssignment;
}

export async function updateEventAssignment(id: string, payload: UpdateEventAssignmentPayload): Promise<void> {
  const { error } = await supabaseBrowser.from("event_assignments").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEventAssignment(id: string): Promise<void> {
  const { error } = await supabaseBrowser.from("event_assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Open positions: event + job_title slots that are unfilled or partially filled */
export type OpenPosition = {
  event_id: string;
  event_name: string;
  event_date: string;
  org_unit_id: string;
  org_unit_name: string;
  job_title_id: string;
  job_title_name: string;
  priority: number;
  required_count: number;
  assigned_count: number;
  status: "open" | "partially_filled" | "filled";
  suggested_action: string;
};

export async function fetchOpenPositions(eventId?: string): Promise<OpenPosition[]> {
  const { data: events } = await supabaseBrowser
    .from("etkinlik_events")
    .select("id, name, date")
    .order("date", { ascending: false })
    .limit(50);
  if (!events?.length) return [];

  const eventIds = eventId ? [eventId] : (events as { id: string }[]).map((e) => e.id);
  const { data: jobTitles } = await supabaseBrowser
    .from("job_titles")
    .select("id, name, org_unit_id, rank_order")
    .eq("active", true);
  if (!jobTitles?.length) return [];

  const { data: assignments } = await supabaseBrowser
    .from("event_assignments")
    .select("event_id, job_title_id")
    .in("event_id", eventIds)
    .eq("status", "active");

  const assignCount = new Map<string, number>();
  for (const a of assignments ?? []) {
    const key = `${a.event_id}:${a.job_title_id}`;
    assignCount.set(key, (assignCount.get(key) ?? 0) + 1);
  }

  const { data: orgUnits } = await supabaseBrowser.from("org_units").select("id, name");
  const orgMap = new Map((orgUnits ?? []).map((o) => [o.id, o]));

  const eventMap = new Map((events as { id: string; name: string; date: string }[]).map((e) => [e.id, e]));
  const positions: OpenPosition[] = [];

  for (const eid of eventIds) {
    const ev = eventMap.get(eid);
    if (!ev) continue;
    for (const jt of jobTitles as { id: string; name: string; org_unit_id?: string | null; rank_order?: number }[]) {
      const orgId = jt.org_unit_id ?? "unknown";
      const count = assignCount.get(`${eid}:${jt.id}`) ?? 0;
      const required = 1;
      const status: OpenPosition["status"] = count >= required ? "filled" : count > 0 ? "partially_filled" : "open";
      const suggested = status === "open" ? "Atama yap" : status === "partially_filled" ? "Tamamla" : "—";
      positions.push({
        event_id: eid,
        event_name: ev.name,
        event_date: ev.date,
        org_unit_id: orgId,
        org_unit_name: orgMap.get(orgId)?.name ?? "—",
        job_title_id: jt.id,
        job_title_name: jt.name,
        priority: jt.rank_order ?? 0,
        required_count: required,
        assigned_count: count,
        status,
        suggested_action: suggested,
      });
    }
  }

  return positions.sort((a, b) => a.event_date.localeCompare(b.event_date) || b.priority - a.priority);
}

/** Conflict: same person assigned to overlapping events */
export type AssignmentConflict = {
  personnel_id: string;
  personnel_name: string;
  event_a_id: string;
  event_a_name: string;
  event_a_date: string;
  event_b_id: string;
  event_b_name: string;
  event_b_date: string;
  conflict_type: "overlapping_assignment" | "duplicate_seat" | "invalid_acting_overlap";
  date_range: string;
  severity: "high" | "medium" | "low";
  assignment_ids: string[];
};

export async function fetchAssignmentConflicts(): Promise<AssignmentConflict[]> {
  const { data: assignments } = await supabaseBrowser
    .from("event_assignments")
    .select("id, personnel_id, event_id, start_date, end_date, assignment_type");

  if (!assignments?.length) return [];

  const { data: events } = await supabaseBrowser.from("etkinlik_events").select("id, name, date");
  const eventMap = new Map((events ?? []).map((e) => [e.id, e]));
  const { data: personnel } = await supabaseBrowser.from("personnel").select("id, first_name, last_name, full_name");
  const personMap = new Map((personnel ?? []).map((p) => [p.id, p]));

  type AssignRow = { id: string; personnel_id: string; event_id: string; start_date?: string | null; end_date?: string | null; assignment_type?: string };
  const byPerson = new Map<string, AssignRow[]>();
  for (const a of assignments as AssignRow[]) {
    const list = byPerson.get(a.personnel_id) ?? [];
    list.push(a);
    byPerson.set(a.personnel_id, list);
  }

  const conflicts: AssignmentConflict[] = [];
  for (const [pid, list] of byPerson) {
    if (list.length < 2) continue;
    const person = personMap.get(pid);
    const name = person?.full_name ?? [person?.first_name, person?.last_name].filter(Boolean).join(" ") ?? "—";
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] as { event_id: string; start_date?: string | null; end_date?: string | null };
        const b = list[j] as { event_id: string; start_date?: string | null; end_date?: string | null };
        if (a.event_id === b.event_id) continue;
        const evA = eventMap.get(a.event_id);
        const evB = eventMap.get(b.event_id);
        const dateA = evA?.date ?? a.start_date ?? a.end_date ?? "";
        const dateB = evB?.date ?? b.start_date ?? b.end_date ?? "";
        const range = [dateA, dateB].filter(Boolean).join(" – ");
        conflicts.push({
          personnel_id: pid,
          personnel_name: name,
          event_a_id: a.event_id,
          event_a_name: evA?.name ?? "—",
          event_a_date: dateA,
          event_b_id: b.event_id,
          event_b_name: evB?.name ?? "—",
          event_b_date: dateB,
          conflict_type: "overlapping_assignment",
          date_range: range,
          severity: "high",
          assignment_ids: [list[i], list[j]].map((x) => x.id),
        });
      }
    }
  }
  return conflicts;
}

/** Payroll approval record */
export type PayrollApproval = {
  id: string;
  personnel_id: string;
  event_id: string;
  assignment_type: string;
  worked_days: number | null;
  period_start: string | null;
  period_end: string | null;
  compensation_type: string;
  amount: number;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  personnel?: { first_name: string | null; last_name: string | null; full_name?: string | null } | null;
  etkinlik_events?: { name: string; date: string } | null;
};

export async function fetchPayrollApprovals(filters?: { status?: "pending" | "approved" | "rejected" | "all" }): Promise<PayrollApproval[]> {
  try {
  let query = supabaseBrowser
    .from("payroll_approvals")
    .select(`
      id, personnel_id, event_id, assignment_type, worked_days, period_start, period_end,
      compensation_type, amount, approval_status, created_at, updated_at,
      personnel (first_name, last_name, full_name),
      etkinlik_events (name, date)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("approval_status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const pers = Array.isArray(r.personnel) ? r.personnel[0] : r.personnel;
    const ev = Array.isArray(r.etkinlik_events) ? r.etkinlik_events[0] : r.etkinlik_events;
    return { ...r, personnel: pers ?? null, etkinlik_events: ev ?? null } as PayrollApproval;
  });
  } catch {
    return [];
  }
}

export async function updatePayrollApprovalStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  const { error } = await supabaseBrowser
    .from("payroll_approvals")
    .update({
      approval_status: status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createPayrollApproval(payload: {
  personnel_id: string;
  event_id: string;
  assignment_type?: "primary" | "acting";
  worked_days?: number;
  period_start?: string;
  period_end?: string;
  compensation_type?: "daily" | "monthly" | "fixed";
  amount: number;
}): Promise<void> {
  const { error } = await supabaseBrowser.from("payroll_approvals").insert({
    personnel_id: payload.personnel_id,
    event_id: payload.event_id,
    assignment_type: payload.assignment_type ?? "primary",
    worked_days: payload.worked_days ?? null,
    period_start: payload.period_start ?? null,
    period_end: payload.period_end ?? null,
    compensation_type: payload.compensation_type ?? "daily",
    amount: payload.amount,
    approval_status: "pending",
  });
  if (error) throw new Error(error.message);
}

/** Payroll transfer queue record */
export type PayrollTransfer = {
  id: string;
  payroll_approval_id: string;
  personnel_id: string;
  event_id: string;
  approved_amount: number;
  approval_date: string;
  transfer_status: "ready" | "transferred" | "failed";
  reference: string | null;
  created_at: string;
  personnel?: { first_name: string | null; last_name: string | null; full_name?: string | null } | null;
  etkinlik_events?: { name: string; date: string } | null;
};

export async function fetchPayrollTransfers(filters?: { status?: "ready" | "transferred" | "failed" | "all" }): Promise<PayrollTransfer[]> {
  try {
  let query = supabaseBrowser
    .from("payroll_transfer_queue")
    .select(`
      id, payroll_approval_id, personnel_id, event_id, approved_amount, approval_date,
      transfer_status, reference, created_at,
      personnel (first_name, last_name, full_name),
      etkinlik_events (name, date)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("transfer_status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const pers = Array.isArray(r.personnel) ? r.personnel[0] : r.personnel;
    const ev = Array.isArray(r.etkinlik_events) ? r.etkinlik_events[0] : r.etkinlik_events;
    return { ...r, personnel: pers ?? null, etkinlik_events: ev ?? null } as PayrollTransfer;
  });
  } catch {
    return [];
  }
}

export async function createTransferFromApproval(approvalId: string): Promise<void> {
  const { data: approval } = await supabaseBrowser
    .from("payroll_approvals")
    .select("id, personnel_id, event_id, amount, approved_at")
    .eq("id", approvalId)
    .eq("approval_status", "approved")
    .single();
  if (!approval) throw new Error("Approval not found or not approved");

  const approvalDate = approval.approved_at ? new Date(approval.approved_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const { error } = await supabaseBrowser.from("payroll_transfer_queue").insert({
    payroll_approval_id: approval.id,
    personnel_id: approval.personnel_id,
    event_id: approval.event_id,
    approved_amount: approval.amount,
    approval_date: approvalDate,
    transfer_status: "ready",
  });
  if (error) throw new Error(error.message);
}

export async function updateTransferStatus(id: string, status: "transferred" | "failed", reference?: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("payroll_transfer_queue")
    .update({
      transfer_status: status,
      reference: reference ?? null,
      transferred_at: status === "transferred" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
