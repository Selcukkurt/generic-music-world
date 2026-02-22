/**
 * Approval request types and helpers.
 */

export type RequestType = "role_change" | "expense" | "access" | "contract" | "other";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type RequestPriority = "low" | "normal" | "high";

export interface ApprovalRequest {
  id: string;
  created_at: string;
  updated_at: string;
  requested_by: string;
  request_type: RequestType;
  title: string;
  description: string | null;
  status: RequestStatus;
  priority: RequestPriority;
  target_entity_type: string | null;
  target_entity_id: string | null;
  payload: Record<string, unknown>;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  attachments: unknown[];
  requester_seen: boolean;
}

export const REQUEST_TYPES: { id: RequestType; label: string }[] = [
  { id: "role_change", label: "Rol Değişikliği" },
  { id: "expense", label: "Harcama" },
  { id: "access", label: "Erişim" },
  { id: "contract", label: "Sözleşme" },
  { id: "other", label: "Diğer" },
];

export const REQUEST_STATUSES: { id: RequestStatus; label: string }[] = [
  { id: "pending", label: "Bekleyen" },
  { id: "approved", label: "Onaylandı" },
  { id: "rejected", label: "Reddedildi" },
  { id: "cancelled", label: "İptal" },
];

export const REQUEST_PRIORITIES: { id: RequestPriority; label: string }[] = [
  { id: "low", label: "Düşük" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "Yüksek" },
];

export function statusBadgeClass(status: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
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

export function priorityBadgeClass(priority: RequestPriority): string {
  const map: Record<RequestPriority, string> = {
    low: "bg-[var(--color-surface2)] text-[var(--color-text-muted)]",
    normal: "bg-blue-500/20 text-blue-200",
    high: "bg-amber-500/20 text-amber-200",
  };
  return map[priority];
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay === 1) return "Dün";
  if (diffDay < 7) return `${diffDay} gün önce`;

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
