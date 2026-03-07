"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchPayrollTransfers, updateTransferStatus } from "@/lib/m04/kadro";
import type { PayrollTransfer } from "@/lib/m04/kadro";

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(v);
}

function getPersonName(p: PayrollTransfer): string {
  const pers = p.personnel;
  if (!pers) return "—";
  if (pers.full_name?.trim()) return pers.full_name.trim();
  return [pers.first_name, pers.last_name].filter(Boolean).join(" ") || "—";
}

export default function FinansTransferClient() {
  const toast = useToast();
  const [list, setList] = useState<PayrollTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ready" | "transferred" | "failed" | "all">("ready");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollTransfers({ status: statusFilter });
      setList(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Aktarım kuyruğu yüklenemedi.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkTransferred = async (id: string) => {
    try {
      await updateTransferStatus(id, "transferred", `TRF-${Date.now()}`);
      toast.success("Başarılı", "Aktarım tamamlandı olarak işaretlendi.");
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncelleme başarısız.");
    }
  };

  const statusLabel = (s: string) => (s === "ready" ? "Hazır" : s === "transferred" ? "Aktarıldı" : "Başarısız");
  const statusStyle = (s: string) =>
    s === "ready"
      ? "bg-amber-500/20 text-amber-200"
      : s === "transferred"
        ? "bg-emerald-500/20 text-emerald-200"
        : "bg-red-500/20 text-red-300";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Finans Aktarım"
        subtitle="Onaylanan ödemelerin M03 Finans aktarım kuyruğu. Tam entegrasyon hazırlık aşamasında."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="ready">Hazır</option>
            <option value="transferred">Aktarıldı</option>
            <option value="failed">Başarısız</option>
            <option value="all">Tümü</option>
          </select>
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
              {statusFilter !== "all" ? "Bu filtreyle kayıt bulunamadı." : "Aktarım kuyruğu boş."}
            </p>
            <p className="mt-1 text-xs ui-text-muted">
              Hak Ediş Onayı ekranından onaylanan kayıtları &quot;Finansa Aktar&quot; ile buraya ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Onaylanan Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Onay Tarihi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Aktarım Durumu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Referans</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{getPersonName(r)}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      <p>{(r.etkinlik_events as { name?: string })?.name ?? "—"}</p>
                      <p className="text-xs ui-text-muted">{formatDate((r.etkinlik_events as { date?: string })?.date)}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{formatCurrency(r.approved_amount)}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{formatDate(r.approval_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle(r.transfer_status)}`}>
                        {statusLabel(r.transfer_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary font-mono">{r.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {r.transfer_status === "ready" && (
                        <button
                          type="button"
                          onClick={() => handleMarkTransferred(r.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Aktarıldı İşaretle
                        </button>
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
