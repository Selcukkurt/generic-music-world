"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchPayrollApprovals,
  updatePayrollApprovalStatus,
  createTransferFromApproval,
} from "@/lib/m04/kadro";
import type { PayrollApproval } from "@/lib/m04/kadro";

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

function getPersonName(p: PayrollApproval): string {
  const pers = p.personnel;
  if (!pers) return "—";
  if (pers.full_name?.trim()) return pers.full_name.trim();
  return [pers.first_name, pers.last_name].filter(Boolean).join(" ") || "—";
}

export default function PayrollApprovalClient() {
  const toast = useToast();
  const [list, setList] = useState<PayrollApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollApprovals({ status: statusFilter });
      setList(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Hak ediş onayları yüklenemedi.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await updatePayrollApprovalStatus(id, "approved");
      toast.success("Başarılı", "Onaylandı.");
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Onaylama başarısız.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updatePayrollApprovalStatus(id, "rejected");
      toast.success("Başarılı", "Reddedildi.");
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Reddetme başarısız.");
    }
  };

  const handleTransfer = async (id: string) => {
    try {
      await createTransferFromApproval(id);
      toast.success("Başarılı", "Finans aktarım kuyruğuna eklendi.");
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Aktarım eklenemedi.");
    }
  };

  const statusLabel = (s: string) => (s === "pending" ? "Beklemede" : s === "approved" ? "Onaylandı" : "Reddedildi");
  const statusStyle = (s: string) =>
    s === "pending"
      ? "bg-amber-500/20 text-amber-200"
      : s === "approved"
        ? "bg-emerald-500/20 text-emerald-200"
        : "bg-red-500/20 text-red-300";

  const compTypeLabel = (t: string) => (t === "daily" ? "Günlük" : t === "monthly" ? "Aylık" : "Sabit");

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Hak Ediş Onayı"
        subtitle="Etkinlik bazlı personel ödemelerini onaylayın. M03 Finans entegrasyonuna hazır."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="ui-input w-36 py-2 text-sm"
          >
            <option value="pending">Beklemede</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
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
              {statusFilter !== "all" ? "Bu filtreyle kayıt bulunamadı." : "Henüz hak ediş kaydı yok."}
            </p>
            <p className="mt-1 text-xs ui-text-muted">Atamalardan hak ediş oluşturulduğunda burada görünecektir.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Etkinlik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Atama Tipi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Çalışılan Gün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Ödeme Tipi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Onay Durumu</th>
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
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      {r.assignment_type === "primary" ? "Asıl" : "Vekil"}
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{r.worked_days ?? "—"}</td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">{compTypeLabel(r.compensation_type)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyle(r.approval_status)}`}>
                        {statusLabel(r.approval_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.approval_status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(r.id)}
                            className="ml-2 rounded px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {r.approval_status === "approved" && (
                        <button
                          type="button"
                          onClick={() => handleTransfer(r.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                        >
                          Finansa Aktar
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
