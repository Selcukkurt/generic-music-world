/**
 * Event Hub types for Etkinlik Operasyonları (M02)
 */

export type EventStatus =
  | "TASLAK"
  | "PLANLAMA"
  | "CANLI"
  | "KAPANIS_HAZIRLIGI"
  | "KAPANDI";

export type AccountingStatus = "PENDING" | "POSTED" | "ERROR";

export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "CANCELLED";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface EtkinlikEvent {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  date: string;
  venue: string | null;
  status: EventStatus;
  description: string | null;
  metadata: Record<string, unknown>;
}

export interface EventRevenue {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  category: string;
  amount: number;
  tax_rate: number;
  net_amount: number | null;
  document_url: string | null;
  accounting_status: AccountingStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface EventExpense {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  vendor: string;
  category: string;
  amount: number;
  tax_rate: number;
  payment_status: PaymentStatus;
  document_url: string | null;
  accounting_status: AccountingStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface EventIncident {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reported_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, unknown>;
}

export interface EventDocument {
  id: string;
  created_at: string;
  event_id: string;
  type: string;
  url: string;
  title: string | null;
  uploaded_by: string | null;
  metadata: Record<string, unknown>;
}

export interface EventCrew {
  id: string;
  created_at: string;
  event_id: string;
  role: string;
  user_id: string | null;
  display_name: string | null;
  metadata: Record<string, unknown>;
}

export interface EventLogistics {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  type: string;
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface AccountingEventLedger {
  id: string;
  created_at: string;
  event_id: string;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  status: string;
  posted_at: string | null;
  metadata: Record<string, unknown>;
}

export interface EventClosureSnapshot {
  id: string;
  created_at: string;
  event_id: string;
  snapshot_json: Record<string, unknown>;
  closed_at: string;
  closed_by: string | null;
}

export interface EventTasksSummary {
  open_count: number;
  total_count: number;
}

export interface EventIncidentsSummary {
  open_count: number;
  critical_open_count: number;
}

export interface EventFinancialsSummary {
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  revenue_completed: boolean;
  expense_completed: boolean;
}

export interface EventClosureChecklist {
  no_open_critical_tasks: boolean;
  no_open_incidents: boolean;
  revenue_completed: boolean;
  expense_completed: boolean;
  docs_uploaded: boolean;
  all_passed: boolean;
}
