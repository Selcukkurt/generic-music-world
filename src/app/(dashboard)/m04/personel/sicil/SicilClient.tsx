"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchPersonnelForSicil } from "@/lib/m04/personnel";
import type { SicilRecord } from "@/lib/m04/personnel";
import { getFullName } from "@/lib/m04/personnel";

export default function SicilClient() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<SicilRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all");
  const [blacklistFilter, setBlacklistFilter] = useState<"all" | "blacklist" | "ok">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPersonnelForSicil({
        search: appliedSearch.trim() || undefined,
        status: statusFilter,
        blacklist: blacklistFilter === "blacklist" ? true : blacklistFilter === "ok" ? false : undefined,
      });
      setList(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Sicil verileri yüklenemedi.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, statusFilter, blacklistFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const riskBadge = (r: SicilRecord) => {
    const styles: Record<string, string> = {
      blacklist: "bg-red-500/20 text-red-300",
      warning: "bg-amber-500/20 text-amber-200",
      ok: "bg-emerald-500/20 text-emerald-200",
    };
    const labels: Record<string, string> = {
      blacklist: "Kara Liste",
      warning: "Uyarı",
      ok: "Normal",
    };
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[r.risk_status] ?? styles.ok}`}>
        {labels[r.risk_status] ?? r.risk_status}
      </span>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Dijital Sicil & Feedback"
        subtitle="Personel sicil kayıtları, etkinlik sayısı ve risk durumu."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Ad, e-posta, TC ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setAppliedSearch(search), e.preventDefault())}
            className="ui-input w-56 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "all")}
            className="ui-input w-28 py-2 text-sm"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          <select
            value={blacklistFilter}
            onChange={(e) => setBlacklistFilter(e.target.value as "all" | "blacklist" | "ok")}
            className="ui-input w-32 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="ok">Kara Liste Dışı</option>
            <option value="blacklist">Kara Liste</option>
          </select>
          <button
            type="button"
            onClick={() => setAppliedSearch(search)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Filtrele
          </button>
        </div>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {appliedSearch || statusFilter !== "all" || blacklistFilter !== "all"
                ? "Bu filtrelerle sonuç bulunamadı."
                : "Henüz sicil kaydı yok."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Unvan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Organizasyon Birimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik Sayısı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Ort. Puan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Son Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Risk Durumu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {list.map((record) => (
                  <tr
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/m04/personel/kart?id=${record.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/m04/personel/kart?id=${record.id}`)}
                    className="cursor-pointer border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{getFullName(record)}</p>
                      <p className="text-xs ui-text-muted">{record.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.job_titles?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.org_units?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.event_count}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{record.avg_rating ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary max-w-[180px] truncate">{record.latest_feedback ?? "—"}</td>
                    <td className="px-4 py-3">{riskBadge(record)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => router.push(`/m04/personel/kart?id=${record.id}`)}
                        className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                      >
                        Kartı Aç
                      </button>
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
