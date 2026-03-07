"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchAssignmentConflicts } from "@/lib/m04/kadro";
import type { AssignmentConflict } from "@/lib/m04/kadro";

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

export default function ConflictCheckClient() {
  const toast = useToast();
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssignmentConflicts();
      setConflicts(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Çakışma verileri yüklenemedi.");
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const conflictTypeLabel = (t: string) =>
    t === "overlapping_assignment"
      ? "Çakışan atama"
      : t === "duplicate_seat"
        ? "Çift koltuk"
        : t === "invalid_acting_overlap"
          ? "Geçersiz vekil çakışması"
          : t;

  const severityLabel = (s: string) => (s === "high" ? "Yüksek" : s === "medium" ? "Orta" : "Düşük");

  const severityStyle = (s: string) =>
    s === "high"
      ? "bg-red-500/20 text-red-300"
      : s === "medium"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-slate-500/20 text-slate-400";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Çakışma Kontrolü"
        subtitle="Aynı personelin çakışan etkinlik atamalarını tespit edin ve yönetin."
      >
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Yenile
        </button>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">Çakışma bulunamadı.</p>
            <p className="mt-1 text-xs ui-text-muted">Tüm atamalar uyumlu görünüyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik A</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik B</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Çakışma Tipi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Tarih Aralığı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Önem</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c, idx) => (
                  <tr key={`${c.personnel_id}-${c.event_a_id}-${c.event_b_id}-${idx}`} className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.personnel_name}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      <p>{c.event_a_name}</p>
                      <p className="text-xs ui-text-muted">{formatDate(c.event_a_date)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      <p>{c.event_b_name}</p>
                      <p className="text-xs ui-text-muted">{formatDate(c.event_b_date)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{conflictTypeLabel(c.conflict_type)}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{c.date_range}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityStyle(c.severity)}`}>
                        {severityLabel(c.severity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/m04/kadro/atama"
                        className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Atamayı Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
