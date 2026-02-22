/**
 * Calendar event types and helpers.
 */

export type EventType = "plan" | "meeting" | "release" | "event" | "other";
export type EventStatus = "pending" | "approved" | "rejected" | "cancelled";
export type EventVisibility = "private" | "team";

export interface CalendarEvent {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string | null;
  event_type: EventType;
  status: EventStatus;
  visibility: EventVisibility;
  metadata: Record<string, unknown>;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
}

export const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "meeting", label: "Toplantı" },
  { id: "release", label: "Release" },
  { id: "event", label: "Etkinlik" },
  { id: "other", label: "Diğer" },
];

export const EVENT_STATUSES: { id: EventStatus; label: string }[] = [
  { id: "pending", label: "Bekleyen" },
  { id: "approved", label: "Onaylı" },
  { id: "rejected", label: "Reddedildi" },
  { id: "cancelled", label: "İptal" },
];

export function statusBadgeClass(status: EventStatus): string {
  const map: Record<EventStatus, string> = {
    pending: "bg-amber-500/20 text-amber-200",
    approved: "bg-emerald-500/20 text-emerald-200",
    rejected: "bg-red-500/20 text-red-200",
    cancelled: "bg-[var(--color-surface2)] text-[var(--color-text-muted)]",
  };
  return map[status];
}

export function typeBadgeClass(): string {
  return "bg-blue-500/20 text-blue-200";
}

/** For month grid pills: pending=subtle, approved=normal, rejected=muted */
export function statusPillClass(status: EventStatus): string {
  const map: Record<EventStatus, string> = {
    pending: "bg-amber-500/10 text-amber-300/90 border border-amber-500/20",
    approved: "bg-emerald-500/20 text-emerald-200",
    rejected: "bg-[var(--color-surface2)] text-[var(--color-text-muted)]",
    cancelled: "bg-[var(--color-surface2)] text-[var(--color-text-muted)]",
  };
  return map[status];
}

/** Get YYYY-MM-DD in Europe/Istanbul for grouping events by day */
export function toLocalDateKey(iso: string, tz = "Europe/Istanbul"): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

export function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleDateString("tr-TR")} ${s.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} - ${e.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${s.toLocaleString("tr-TR")} - ${e.toLocaleString("tr-TR")}`;
}
