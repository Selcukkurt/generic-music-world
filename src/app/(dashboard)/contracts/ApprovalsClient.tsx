"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchApprovalRequests,
  createApprovalRequest,
  approveRequest,
  rejectRequest,
} from "@/lib/approvals/data";
import type { ApprovalRequest } from "@/lib/approvals/types";
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  statusBadgeClass,
  typeBadgeClass,
  priorityBadgeClass,
  formatRelativeTime,
} from "@/lib/approvals/types";

const ADMIN_ROLES = ["system_owner", "ceo", "admin"];

export default function ApprovalsClient() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await fetchApprovalRequests(user.id, isAdmin, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        requestType: typeFilter !== "all" ? typeFilter : undefined,
        search: appliedSearch.trim() || undefined,
      });
      setRequests(list);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "İstekler yüklenemedi.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, statusFilter, typeFilter, appliedSearch, toast]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  const handleCreate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user) return;
      const form = e.currentTarget;
      const type = (form.elements.namedItem("request_type") as HTMLSelectElement).value;
      const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
      const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim() || null;
      const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value;
      if (!title) {
        toast.error("Hata", "Başlık gerekli.");
        return;
      }
      setCreateSubmitting(true);
      try {
        const created = await createApprovalRequest(user.id, {
          request_type: type,
          title,
          description,
          priority,
        });
        setRequests((prev) => [created, ...prev]);
        setShowCreateModal(false);
        setSelected(created);
        toast.success("Tamamlandı", "İstek oluşturuldu.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "İstek oluşturulamadı.");
      } finally {
        setCreateSubmitting(false);
      }
    },
    [user, toast]
  );

  const handleApprove = useCallback(
    async (r: ApprovalRequest) => {
      if (!user || !isAdmin || r.status !== "pending") return;
      const prev = [...requests];
      setRequests((list) =>
        list.map((x) =>
          x.id === r.id
            ? {
                ...x,
                status: "approved" as const,
                decided_by: user.id,
                decided_at: new Date().toISOString(),
                decision_reason: null,
              }
            : x
        )
      );
      if (selected?.id === r.id) {
        setSelected((s) =>
          s?.id === r.id
            ? {
                ...s,
                status: "approved" as const,
                decided_by: user.id,
                decided_at: new Date().toISOString(),
                decision_reason: null,
              }
            : s
        );
      }
      try {
        await approveRequest(r.id, user.id);
        toast.success("Tamamlandı", "İstek onaylandı.");
      } catch {
        setRequests(prev);
        setSelected(requests.find((x) => x.id === r.id) ?? null);
        toast.error("Hata", "Onaylama başarısız.");
      }
    },
    [user, isAdmin, requests, selected, toast]
  );

  const handleRejectClick = useCallback((r: ApprovalRequest) => {
    setRejectTarget(r);
    setRejectReason("");
    setShowRejectModal(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!user || !isAdmin || !rejectTarget || !rejectReason.trim()) return;
    setRejectSubmitting(true);
    const prev = [...requests];
    setRequests((list) =>
      list.map((x) =>
        x.id === rejectTarget.id
          ? {
              ...x,
              status: "rejected" as const,
              decided_by: user.id,
              decided_at: new Date().toISOString(),
              decision_reason: rejectReason.trim(),
            }
          : x
      )
    );
    if (selected?.id === rejectTarget.id) {
      setSelected((s) =>
        s?.id === rejectTarget.id
          ? {
              ...s,
              status: "rejected" as const,
              decided_by: user.id,
              decided_at: new Date().toISOString(),
              decision_reason: rejectReason.trim(),
            }
          : s
      );
    }
    try {
      await rejectRequest(rejectTarget.id, user.id, rejectReason.trim());
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Tamamlandı", "İstek reddedildi.");
    } catch {
      setRequests(prev);
      setSelected(requests.find((x) => x.id === rejectTarget.id) ?? null);
      toast.error("Hata", "Reddetme başarısız.");
    } finally {
      setRejectSubmitting(false);
    }
  }, [user, isAdmin, rejectTarget, rejectReason, requests, selected, toast]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="İstek & Onay"
        subtitle="Ekipten gelen talepleri incele, onayla veya reddet."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setAppliedSearch(search))}
            className="ui-input w-40 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="ui-input w-40 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filtrele
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Yeni İstek
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* List */}
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {appliedSearch || statusFilter !== "all" || typeFilter !== "all"
                  ? "Bu filtrelerde sonuç yok."
                  : "Henüz istek yok."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {requests.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`flex w-full flex-col gap-2 p-4 text-left transition hover:bg-[var(--color-surface-hover)]/50 ${
                    selected?.id === r.id ? "bg-[var(--brand-yellow)]/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[var(--color-text)]">{r.title}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                      {REQUEST_STATUSES.find((s) => s.id === r.status)?.label ?? r.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadgeClass()}`}>
                      {REQUEST_TYPES.find((t) => t.id === r.request_type)?.label ?? r.request_type}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(r.priority)}`}>
                      {r.priority}
                    </span>
                  </div>
                  <p className="text-xs ui-text-muted">{formatRelativeTime(r.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details panel */}
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm lg:min-h-[300px]">
          {selected ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">{selected.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(selected.status)}`}>
                  {REQUEST_STATUSES.find((s) => s.id === selected.status)?.label}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadgeClass()}`}>
                  {REQUEST_TYPES.find((t) => t.id === selected.request_type)?.label}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(selected.priority)}`}>
                  {selected.priority}
                </span>
              </div>
              {selected.description && (
                <p className="text-sm ui-text-secondary">{selected.description}</p>
              )}
              <p className="text-xs ui-text-muted">
                Oluşturulma: {new Date(selected.created_at).toLocaleString("tr-TR")}
              </p>
              {selected.decided_at && (
                <p className="text-xs ui-text-muted">
                  Karar: {new Date(selected.decided_at).toLocaleString("tr-TR")}
                  {selected.decision_reason && ` — ${selected.decision_reason}`}
                </p>
              )}
              {Object.keys(selected.payload).length > 0 && (
                <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50">
                  <summary className="cursor-pointer px-3 py-2 text-sm ui-text-muted">
                    Payload (JSON)
                  </summary>
                  <pre className="max-h-40 overflow-auto p-3 text-xs ui-text-secondary">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </details>
              )}
              {selected.status === "pending" && isAdmin && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(selected)}
                    className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClick(selected)}
                    className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
                  >
                    Reddet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm ui-text-muted">Detayları görmek için bir istek seçin.</p>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni İstek</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Tür</label>
                <select name="request_type" className="ui-input w-full" required>
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlık</label>
                <input name="title" type="text" className="ui-input w-full" placeholder="İstek başlığı" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Açıklama</label>
                <textarea name="description" className="ui-input w-full min-h-[80px]" placeholder="İsteğin detayları" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Öncelik</label>
                <select name="priority" className="ui-input w-full">
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {createSubmitting ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && rejectTarget && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Reddetme nedeni</h2>
            <p className="mt-1 text-sm ui-text-muted">İsteği reddetmek için bir neden girin.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="ui-input mt-4 min-h-[100px] w-full"
              placeholder="Reddetme nedeni…"
              required
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || rejectSubmitting}
                className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
              >
                {rejectSubmitting ? "Reddediliyor…" : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
