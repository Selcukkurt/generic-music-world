/**
 * Event Hub data layer for Etkinlik Operasyonları (M02)
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  EtkinlikEvent,
  EventStatus,
  EventRevenue,
  EventExpense,
  EventIncident,
  EventDocument,
  EventCrew,
  EventLogistics,
  AccountingEventLedger,
  EventClosureChecklist,
  EventFinancialsSummary,
} from "./types";

export async function fetchEvents(params?: {
  status?: EventStatus;
  fromDate?: string;
  toDate?: string;
}): Promise<EtkinlikEvent[]> {
  let query = supabaseBrowser
    .from("etkinlik_events")
    .select("*")
    .order("date", { ascending: false });

  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.fromDate) {
    query = query.gte("date", params.fromDate);
  }
  if (params?.toDate) {
    query = query.lte("date", params.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EtkinlikEvent[];
}

export async function fetchEvent(eventId: string): Promise<EtkinlikEvent | null> {
  const { data, error } = await supabaseBrowser
    .from("etkinlik_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as EtkinlikEvent;
}

export async function updateEventStatus(
  eventId: string,
  status: EventStatus
): Promise<EtkinlikEvent> {
  const { data, error } = await supabaseBrowser
    .from("etkinlik_events")
    .update({ status })
    .eq("id", eventId)
    .select()
    .single();

  if (error) throw error;
  return data as EtkinlikEvent;
}

export async function updateEvent(
  eventId: string,
  payload: {
    name?: string;
    date?: string;
    end_date?: string | null;
    venue?: string | null;
    status?: string;
    budget_planned?: number | null;
  }
): Promise<EtkinlikEvent> {
  const row: Record<string, unknown> = {};
  if (payload.name != null) row.name = payload.name;
  if (payload.date != null) row.date = payload.date;
  if (payload.venue != null) row.venue = payload.venue;
  if (payload.status != null) row.status = payload.status;
  if (payload.budget_planned != null || payload.end_date != null) {
    row.metadata = {
      ...(payload.budget_planned != null && { budget_planned: payload.budget_planned }),
      ...(payload.end_date != null && { end_date: payload.end_date }),
    };
  }

  const { data, error } = await supabaseBrowser
    .from("etkinlik_events")
    .update(row)
    .eq("id", eventId)
    .select()
    .single();

  if (error) throw error;
  return data as EtkinlikEvent;
}

export async function fetchEventRevenues(eventId: string): Promise<EventRevenue[]> {
  const { data, error } = await supabaseBrowser
    .from("event_revenues")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventRevenue[];
}

export async function fetchEventExpenses(eventId: string): Promise<EventExpense[]> {
  const { data, error } = await supabaseBrowser
    .from("event_expenses")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventExpense[];
}

export async function fetchEventIncidents(eventId: string): Promise<EventIncident[]> {
  const { data, error } = await supabaseBrowser
    .from("event_incidents")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventIncident[];
}

export async function fetchEventDocuments(eventId: string): Promise<EventDocument[]> {
  const { data, error } = await supabaseBrowser
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventDocument[];
}

export async function fetchEventCrew(eventId: string): Promise<EventCrew[]> {
  const { data, error } = await supabaseBrowser
    .from("event_crew")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventCrew[];
}

export async function fetchEventLogistics(eventId: string): Promise<EventLogistics[]> {
  const { data, error } = await supabaseBrowser
    .from("event_logistics")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventLogistics[];
}

export async function fetchEventFinancialsSummary(
  eventId: string
): Promise<EventFinancialsSummary> {
  const [revenues, expenses] = await Promise.all([
    fetchEventRevenues(eventId),
    fetchEventExpenses(eventId),
  ]);

  const total_revenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const total_expense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const net_profit = total_revenue - total_expense;

  const revenue_completed =
    revenues.length === 0 ||
    revenues.every((r) => r.accounting_status === "POSTED" || r.accounting_status === "PENDING");
  const expense_completed =
    expenses.length === 0 ||
    expenses.every((e) => e.accounting_status === "POSTED" || e.accounting_status === "PENDING");

  return {
    total_revenue,
    total_expense,
    net_profit,
    revenue_completed,
    expense_completed,
  };
}

export async function fetchEventClosureChecklist(
  eventId: string
): Promise<EventClosureChecklist> {
  const [incidents, documents, financials, eventTasks] = await Promise.all([
    fetchEventIncidents(eventId),
    fetchEventDocuments(eventId),
    fetchEventFinancialsSummary(eventId),
    fetchOpenTasksCountForEvent(eventId),
  ]);

  const no_open_incidents =
    incidents.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length === 0;
  const no_open_critical_tasks = eventTasks.critical_open === 0;
  const revenue_completed = financials.revenue_completed;
  const expense_completed = financials.expense_completed;
  const docs_uploaded = documents.length > 0;

  const all_passed =
    no_open_critical_tasks &&
    no_open_incidents &&
    revenue_completed &&
    expense_completed &&
    docs_uploaded;

  return {
    no_open_critical_tasks,
    no_open_incidents,
    revenue_completed,
    expense_completed,
    docs_uploaded,
    all_passed,
  };
}

async function fetchOpenTasksCountForEvent(eventId: string): Promise<{
  open: number;
  critical_open: number;
}> {
  const { data: links } = await supabaseBrowser
    .from("event_tasks")
    .select("task_id")
    .eq("event_id", eventId);

  if (!links?.length) {
    return { open: 0, critical_open: 0 };
  }

  const taskIds = links.map((l) => l.task_id);
  const { data: tasks } = await supabaseBrowser
    .from("tasks")
    .select("id, status, priority")
    .in("id", taskIds);

  const open = (tasks ?? []).filter((t) => t.status !== "done").length;
  const critical_open = (tasks ?? []).filter(
    (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high")
  ).length;

  return { open, critical_open };
}

export async function closeEvent(
  eventId: string,
  closedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const checklist = await fetchEventClosureChecklist(eventId);
    if (!checklist.all_passed) {
      return {
        success: false,
        error: "Kapanış kontrol listesi tamamlanmadı. Tüm maddeleri karşılayın.",
      };
    }

    const event = await fetchEvent(eventId);
    if (!event) return { success: false, error: "Etkinlik bulunamadı." };
    if (event.status === "KAPANDI") {
      return { success: false, error: "Etkinlik zaten kapatılmış." };
    }

    const financials = await fetchEventFinancialsSummary(eventId);
    const incidents = await fetchEventIncidents(eventId);
    const documents = await fetchEventDocuments(eventId);

    const snapshot = {
      event: event,
      financials,
      incidents_count: incidents.length,
      documents_count: documents.length,
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
    };

    const { error: snapError } = await supabaseBrowser.from("event_closure_snapshot").insert({
      event_id: eventId,
      snapshot_json: snapshot,
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
    });

    if (snapError) throw snapError;

    const ledgerRow = {
      event_id: eventId,
      total_revenue: financials.total_revenue,
      total_expense: financials.total_expense,
      net_profit: financials.net_profit,
      status: "PENDING" as const,
      metadata: { closed_by: closedBy },
    };
    const { error: ledgerError } = await supabaseBrowser
      .from("accounting_event_ledger")
      .upsert(ledgerRow, { onConflict: "event_id" });

    if (ledgerError) throw ledgerError;

    const { error: updateError } = await supabaseBrowser
      .from("etkinlik_events")
      .update({ status: "KAPANDI" })
      .eq("id", eventId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

/** Upcoming events (date >= today) ordered by date asc. */
export async function fetchUpcomingEvents(): Promise<EtkinlikEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseBrowser
    .from("etkinlik_events")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as EtkinlikEvent[];
}

export type DashboardKPIs = {
  upcomingEventsNext7Days: number;
  openCriticalTasks: number;
  pendingApprovals: number;
  openIncidents: number;
};

export async function fetchDashboardKPIs(
  eventId: string | null
): Promise<DashboardKPIs> {
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const in7Str = in7Days.toISOString().slice(0, 10);

  const [eventsRes, incidentsRes, linksRes, approvalsRes] = await Promise.all([
    supabaseBrowser
      .from("etkinlik_events")
      .select("*", { count: "exact", head: true })
      .gte("date", todayStr)
      .lte("date", in7Str),
    eventId
      ? supabaseBrowser
          .from("event_incidents")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId)
          .in("status", ["OPEN", "IN_PROGRESS"])
      : Promise.resolve({ count: 0 }),
    eventId
      ? supabaseBrowser.from("event_tasks").select("task_id").eq("event_id", eventId)
      : Promise.resolve({ data: [] }),
    eventId
      ? supabaseBrowser
          .from("approval_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("target_entity_type", "event")
          .eq("target_entity_id", eventId)
      : Promise.resolve({ count: 0 }),
  ]);

  let openCriticalTasks = 0;
  if (eventId && linksRes.data?.length) {
    const taskIds = linksRes.data.map((l) => l.task_id);
    const { data: tasks } = await supabaseBrowser
      .from("tasks")
      .select("id, status, priority")
      .in("id", taskIds)
      .neq("status", "done");
    openCriticalTasks = (tasks ?? []).filter(
      (t) => t.priority === "urgent" || t.priority === "high"
    ).length;
  }

  return {
    upcomingEventsNext7Days: eventsRes.count ?? 0,
    openCriticalTasks,
    pendingApprovals: approvalsRes.count ?? 0,
    openIncidents: incidentsRes.count ?? 0,
  };
}

export type ActionCenterItem =
  | { type: "task"; id: string; title: string; dueDate: string | null; priority: string; isCritical: boolean }
  | { type: "document"; docType: string; label: string };

export async function fetchActionCenterItems(
  eventId: string | null,
  limit = 10
): Promise<ActionCenterItem[]> {
  const items: ActionCenterItem[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  if (eventId) {
    const { data: links } = await supabaseBrowser
      .from("event_tasks")
      .select("task_id")
      .eq("event_id", eventId);

    if (links?.length) {
      const taskIds = links.map((l) => l.task_id);
      const { data: tasks } = await supabaseBrowser
        .from("tasks")
        .select("id, title, due_date, priority, status")
        .in("id", taskIds)
        .neq("status", "done")
        .neq("is_archived", true);

      const taskList = (tasks ?? []).filter(
        (t) =>
          t.due_date === todayStr ||
          t.priority === "urgent" ||
          t.priority === "high"
      );
      for (const t of taskList.slice(0, limit)) {
        items.push({
          type: "task",
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority,
          isCritical: t.priority === "urgent" || t.priority === "high",
        });
      }
    }

    const REQUIRED_DOC_TYPES = [
      { type: "contract", label: "Sözleşme" },
      { type: "insurance", label: "Sigorta" },
      { type: "venue_agreement", label: "Mekan Anlaşması" },
    ];
    const { data: docs } = await supabaseBrowser
      .from("event_documents")
      .select("type")
      .eq("event_id", eventId);
    const uploadedTypes = new Set((docs ?? []).map((d) => d.type));
    for (const { type, label } of REQUIRED_DOC_TYPES) {
      if (!uploadedTypes.has(type) && items.length < limit) {
        items.push({ type: "document", docType: type, label });
      }
    }
  }

  return items.slice(0, limit);
}

export async function linkTaskToEvent(taskId: string, eventId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("event_tasks").insert({
    event_id: eventId,
    task_id: taskId,
  });
  if (error) throw error;
}

export async function createEvent(payload: {
  name: string;
  date: string;
  end_date?: string | null;
  venue?: string | null;
  description?: string | null;
  status?: string;
  budget_planned?: number | null;
  created_by?: string | null;
}): Promise<EtkinlikEvent> {
  const row: Record<string, unknown> = {
    name: payload.name,
    date: payload.date,
    venue: payload.venue ?? null,
    description: payload.description ?? null,
    created_by: payload.created_by ?? null,
    status: payload.status ?? "TASLAK",
    metadata: {
      ...(payload.end_date && { end_date: payload.end_date }),
      ...(payload.budget_planned != null && { budget_planned: payload.budget_planned }),
    },
  };

  const { data, error } = await supabaseBrowser
    .from("etkinlik_events")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as EtkinlikEvent;
}

export async function createEventIncident(
  eventId: string,
  payload: {
    title: string;
    description?: string | null;
    severity?: string;
    reported_by?: string | null;
  }
): Promise<EventIncident> {
  const { data, error } = await supabaseBrowser
    .from("event_incidents")
    .insert({
      event_id: eventId,
      title: payload.title,
      description: payload.description ?? null,
      severity: payload.severity ?? "LOW",
      reported_by: payload.reported_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EventIncident;
}

export async function createEventDocument(
  eventId: string,
  payload: {
    type: string;
    url: string;
    title?: string | null;
    uploaded_by?: string | null;
  }
): Promise<EventDocument> {
  const { data, error } = await supabaseBrowser
    .from("event_documents")
    .insert({
      event_id: eventId,
      type: payload.type,
      url: payload.url,
      title: payload.title ?? null,
      uploaded_by: payload.uploaded_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EventDocument;
}

export async function fetchAccountingLedgerForEvent(
  eventId: string
): Promise<AccountingEventLedger | null> {
  const { data, error } = await supabaseBrowser
    .from("accounting_event_ledger")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as AccountingEventLedger;
}
