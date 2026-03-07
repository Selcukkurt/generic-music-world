"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchOpenPositions } from "@/lib/m04/kadro";

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

export default function OpenPositionsClient() {
  const toast = useToast();
  const [positions, setPositions] = useState<Awaited<ReturnType<typeof fetchOpenPositions>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "partially_filled" | "filled">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOpenPositions();
      setPositions(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Açık pozisyonlar yüklenemedi.");
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    statusFilter === "all"
      ? positions
      : positions.filter((p) => p.status === statusFilter);

  const statusLabel = (s: string) =>
    s === "open" ? "Açık" : s === "partially_filled" ? "Kısmen Dolu" : "Dolu";

  const statusStyle = (s: string) =>
    s === "open"
      ? "bg-amber-500/20 text-amber-200"
      : s === "partially_filled"
        ? "bg-blue-500/20 text-blue-200"
        : "bg-emerald-500/20 text-emerald-200";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Açık Pozisyonlar"
        subtitle="Etkinlik bazlı boş ve kısmen dolu pozisyonlar. Hızlı atama için kullanın."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="ui-input w-40 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="open">Açık</option>
            <option value="partially_filled">Kısmen Dolu</option>
            <option value="filled">Dolu</option>
          </select>
          <Link
            href="/m04/kadro/atama"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Atama Yap
          </Link>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {statusFilter !== "all" ? "Bu filtreyle pozisyon bulunamadı." : "Açık pozisyon bulunamadı."}
            </p>
            <Link
              href="/m04/kadro/atama"
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Atama Ekranına Git
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Organizasyon Birimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Pozisyon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Öncelik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Önerilen İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={`${p.event_id}-${p.job_title_id}-${idx}`} className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{p.event_name}</p>
                      <p className="text-xs ui-text-muted">{formatDate(p.event_date)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{p.org_unit_name}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{p.job_title_name}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{p.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.suggested_action !== "—" ? (
                        <Link
                          href="/m04/kadro/atama"
                          className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                        >
                          {p.suggested_action}
                        </Link>
                      ) : (
                        <span className="text-sm ui-text-muted">{p.suggested_action}</span>
                      )}
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
