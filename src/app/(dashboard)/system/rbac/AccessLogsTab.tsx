"use client";

import { useEffect, useState, useCallback } from "react";
import type { LogEvent, LogFilters } from "@/lib/audit/types";
import { fetchLogs } from "@/lib/audit/data";

const PAGE_SIZES = [25, 50, 100];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default function AccessLogsTab() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLogs(filters, page, pageSize)
      .then((res) => {
        setEvents(res.events);
        setTotal(res.total);
      })
      .catch((err) => {
        setEvents([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Kayıtlar yüklenemedi.");
      })
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const applySearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput.trim() || undefined }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="ui-glass overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Erişim Kayıtları</h2>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Ara (aksiyon, kullanıcı, modül)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applySearch())}
              className="ui-input w-full max-w-xs text-sm"
            />
            <button
              type="button"
              onClick={applySearch}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Filtrele
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Kullanıcı</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Aksiyon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Modül</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">Tarih</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase ui-text-muted">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center ui-text-muted">
                  Yükleniyor...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-amber-200">{error}</p>
                  <button
                    type="button"
                    onClick={load}
                    className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
                  >
                    Yeniden Dene
                  </button>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center ui-text-muted">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="transition hover:bg-[var(--color-surface-hover)]/50">
                  <td className="px-4 py-3 text-sm ui-text-secondary">
                    {ev.actor.email ?? ev.actor.id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">
                    {ev.action}
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-secondary">
                    {ev.category ?? ev.target?.entity ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-muted">
                    {formatDate(ev.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm ui-text-muted font-mono">
                    {ev.request?.ip ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:px-6">
        <div className="flex items-center gap-4">
          <span className="text-sm ui-text-muted">Sayfa başına:</span>
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
          <span className="text-sm ui-text-muted">Toplam {total} kayıt</span>
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
    </section>
  );
}
