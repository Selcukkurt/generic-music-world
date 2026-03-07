"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchVekaletPositions } from "@/lib/org-structure/data";
import type { VekaletPosition } from "@/lib/org-structure/data";

const ACTING_FALLBACK = "Vekaleten: Selcuk Kurt (CEO)";

export default function DelegationPanelClient() {
  const toast = useToast();
  const [positions, setPositions] = useState<VekaletPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVekaletPositions();
      setPositions(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Vekalet verileri yüklenemedi.");
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const vacantCount = positions.filter((p) => p.status === "vacant").length;
  const statusLabel = (s: VekaletPosition["status"]) =>
    s === "filled" ? "Dolu" : s === "vacant" ? "Boş" : "Vekalet";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Vekalet Paneli"
        subtitle="Boş pozisyonlar ve vekalet atamaları. Sorumlu atanmamış pozisyonlarda vekalet gösterilir."
      >
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Yenile
        </button>
      </PageHeader>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 backdrop-blur-sm">
        <p className="text-sm ui-text-secondary">
          <strong>Vekalet kuralı:</strong> Sorumlu atanmamış pozisyonlarda gösterilir:{" "}
          <span className="rounded bg-[var(--color-surface2)] px-2 py-0.5 font-mono text-xs">
            {ACTING_FALLBACK}
          </span>
        </p>
      </div>

      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-sm font-medium text-[var(--color-text)]">Pozisyon bulunamadı.</p>
            <p className="mt-1 text-xs ui-text-muted">
            Person_assignments veya job_titles (org_unit_id ile) tanımlayarak başlayın.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Pozisyon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Organizasyon Birimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Asıl Sorumlu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Vekil Sorumlu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={`${p.org_unit_id}:${p.job_title_id}`}
                    className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{p.job_title_name}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{p.org_unit_name}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      {p.primary_person?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      {p.acting_person ? (
                        <span className="italic">{p.acting_person}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          p.status === "vacant"
                            ? "bg-amber-500/20 text-amber-200"
                            : p.status === "acting"
                              ? "bg-blue-500/20 text-blue-200"
                              : "bg-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && vacantCount > 0 && (
        <div className="ui-glass rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {vacantCount} boş pozisyon vekalet kuralı kullanıyor
          </p>
          <p className="mt-1 text-xs ui-text-muted">
            Personel ataması yaparak vekaleti kaldırabilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
