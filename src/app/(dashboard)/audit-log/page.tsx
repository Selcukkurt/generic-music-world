"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import RequireSystemOwner from "@/components/auth/RequireSystemOwner";
import { useToast } from "@/components/ui/ToastProvider";
import type { LogEvent, LogFilters, LogSeverity, LogCategory, LogStatus } from "@/lib/audit/types";
import { fetchLogs } from "@/lib/audit/data";

const SEVERITIES: { id: LogSeverity; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "warning", label: "Warning" },
  { id: "error", label: "Error" },
  { id: "critical", label: "Critical" },
];

const CATEGORIES: { id: LogCategory; label: string }[] = [
  { id: "auth", label: "Auth" },
  { id: "db", label: "DB" },
  { id: "settings", label: "Settings" },
  { id: "roles", label: "Roles" },
  { id: "releases", label: "Releases" },
  { id: "security", label: "Security" },
  { id: "import_export", label: "Import/Export" },
  { id: "system", label: "System" },
];

const STATUSES: { id: LogStatus; label: string }[] = [
  { id: "success", label: "Başarılı" },
  { id: "failure", label: "Başarısız" },
];

const PAGE_SIZES = [25, 50, 100];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function severityBadge(severity: LogSeverity) {
  const styles: Record<LogSeverity, string> = {
    info: "bg-blue-500/20 text-blue-200",
    warning: "bg-amber-500/20 text-amber-200",
    error: "bg-red-500/20 text-red-200",
    critical: "bg-red-600/30 text-red-100",
  };
  const labels: Record<LogSeverity, string> = {
    info: "Info",
    warning: "Uyarı",
    error: "Hata",
    critical: "Kritik",
  };
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${styles[severity]}`}>
      {labels[severity]}
    </span>
  );
}

function statusBadge(status: LogStatus) {
  if (status === "success")
    return <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-200">Başarılı</span>;
  return <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-200">Başarısız</span>;
}

function categoryLabel(cat: LogCategory) {
  return CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
}

function AuditLogContent() {
  const toast = useToast();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LogEvent | null>(null);

  const [filters, setFilters] = useState<LogFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [severityChecks, setSeverityChecks] = useState<Record<LogSeverity, boolean>>({
    info: false,
    warning: false,
    error: false,
    critical: false,
  });
  const [categorySelect, setCategorySelect] = useState<LogCategory | "">("");
  const [statusSelect, setStatusSelect] = useState<LogStatus | "">("");
  const [actorInput, setActorInput] = useState("");

  const applyFilters = useCallback(() => {
    const severities = (Object.entries(severityChecks) as [LogSeverity, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k);
    setFilters({
      search: searchInput.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      severities: severities.length ? severities : undefined,
      category: categorySelect || undefined,
      status: statusSelect || undefined,
      actor: actorInput.trim() || undefined,
    });
    setPage(1);
  }, [searchInput, dateFrom, dateTo, severityChecks, categorySelect, statusSelect, actorInput]);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setSeverityChecks({ info: false, warning: false, error: false, critical: false });
    setCategorySelect("");
    setStatusSelect("");
    setActorInput("");
    setFilters({});
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Yakında", "CSV dışa aktarma yakında aktif olacak.");
  }, [toast]);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchError(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setFetchError(null);
      }
    });
    fetchLogs(filters, page, pageSize)
      .then((res) => {
        if (!cancelled) {
          setEvents(res.events);
          setTotal(res.total);
          setFetchError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEvents([]);
          setTotal(0);
          setFetchError(err instanceof Error ? err.message : "Loglar yüklenemedi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, retryKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const copyJson = useCallback(() => {
    if (!selected) return;
    const json = JSON.stringify(
      {
        id: selected.id,
        createdAt: selected.createdAt,
        severity: selected.severity,
        category: selected.category,
        action: selected.action,
        message: selected.message,
        actor: selected.actor,
        target: selected.target,
        status: selected.status,
        metadata: selected.metadata,
        request: selected.request,
      },
      null,
      2
    );
    navigator.clipboard.writeText(json).then(
      () => toast.success("Kopyalandı", "JSON panoya kopyalandı."),
      () => toast.error("Hata", "Kopyalama başarısız.")
    );
  }, [selected, toast]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Log Kayıtları"
        subtitle="Sistem olayları, kullanıcı işlemleri ve güvenlik kayıtları."
      />

      {/* Filters */}
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1 block text-xs font-medium ui-text-muted">Ara</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Aksiyon, kullanıcı, hedef, mesaj..."
              className="ui-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ui-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ui-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Seviye</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {SEVERITIES.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={severityChecks[s.id]}
                    onChange={(e) =>
                      setSeverityChecks((prev) => ({ ...prev, [s.id]: e.target.checked }))
                    }
                    className="rounded border-[var(--color-border)]"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Kategori</label>
            <select
              value={categorySelect}
              onChange={(e) => setCategorySelect((e.target.value || "") as LogCategory | "")}
              className="ui-input w-full"
            >
              <option value="">Tümü</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Durum</label>
            <select
              value={statusSelect}
              onChange={(e) => setStatusSelect((e.target.value || "") as LogStatus | "")}
              className="ui-input w-full"
            >
              <option value="">Tümü</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Kullanıcı / Aktör</label>
            <input
              type="text"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              placeholder="E-posta veya ID"
              className="ui-input w-full"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Filtrele
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Dışa Aktar (CSV)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Tarih
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Seviye
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Aksiyon
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Kullanıcı
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Hedef
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ui-text-muted sm:px-6">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm ui-text-muted sm:px-6">
                    Yükleniyor...
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center sm:px-6">
                    <p className="text-sm font-medium text-amber-200">{fetchError}</p>
                    <p className="mt-1 text-xs ui-text-muted">
                      Sayfayı yenileyin veya aşağıdaki butonla tekrar deneyin.
                    </p>
                    <button
                      type="button"
                      onClick={refetch}
                      className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                    >
                      Yeniden Dene
                    </button>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm ui-text-muted sm:px-6">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className={`cursor-pointer transition hover:bg-[var(--color-surface-hover)]/50 ${
                      selected?.id === ev.id ? "bg-[var(--brand-yellow)]/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 text-xs ui-text-muted sm:px-6">
                      {formatDate(ev.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">{severityBadge(ev.severity)}</td>
                    <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                      {categoryLabel(ev.category)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-[var(--color-text)] sm:px-6">
                      {ev.action}
                    </td>
                    <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                      {ev.actor.email ?? ev.actor.id ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm ui-text-secondary sm:px-6">
                      {ev.target ? `${ev.target.entity}${ev.target.id ? ` #${ev.target.id}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">{statusBadge(ev.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:px-6">
          <div className="flex items-center gap-4">
            <span className="text-sm ui-text-muted">
              Sayfa başına:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="ui-input w-20 py-1.5 text-sm"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-sm ui-text-muted">
              Toplam {total} kayıt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>
            <span className="text-sm ui-text-muted">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Details Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:justify-end"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-detail-title"
        >
          <div
            className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:rounded-l-2xl sm:rounded-tr-none sm:border-l sm:border-t-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <h2 id="log-detail-title" className="text-lg font-semibold text-[var(--color-text)]">
                Log Detayı
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 ui-text-muted transition hover:bg-[var(--color-surface-hover)]"
                aria-label="Kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-medium ui-text-muted">Zaman</p>
                <p className="text-sm text-[var(--color-text)]">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Aktör</p>
                <p className="text-sm text-[var(--color-text)]">
                  {selected.actor.email ?? selected.actor.id ?? "—"}
                  {selected.actor.role && (
                    <span className="ml-2 text-xs ui-text-muted">({selected.actor.role})</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium ui-text-muted">Aksiyon / Kategori / Seviye</p>
                <p className="text-sm text-[var(--color-text)]">
                  {selected.action} · {categoryLabel(selected.category)} · {selected.severity}
                </p>
              </div>
              {selected.target && (
                <div>
                  <p className="text-xs font-medium ui-text-muted">Hedef</p>
                  <p className="text-sm text-[var(--color-text)]">
                    {selected.target.entity}
                    {selected.target.id && ` #${selected.target.id}`}
                  </p>
                </div>
              )}
              {selected.message && (
                <div>
                  <p className="text-xs font-medium ui-text-muted">Mesaj</p>
                  <p className="text-sm text-[var(--color-text)]">{selected.message}</p>
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-medium ui-text-muted mb-1">Metadata (JSON)</p>
                  <pre className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 text-xs overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selected.request && (selected.request.ip || selected.request.userAgent) && (
                <div>
                  <p className="text-xs font-medium ui-text-muted">İstek Bilgisi</p>
                  <p className="text-sm text-[var(--color-text)]">
                    {selected.request.ip && <span>IP: {selected.request.ip}</span>}
                    {selected.request.ip && selected.request.userAgent && " · "}
                    {selected.request.userAgent && (
                      <span className="break-all">{selected.request.userAgent}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] p-4">
              <button
                type="button"
                onClick={copyJson}
                className="ui-button-primary w-full rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Kopyala (JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <RequireSystemOwner>
      <AuditLogContent />
    </RequireSystemOwner>
  );
}
