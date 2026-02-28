"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useI18n } from "@/i18n/LocaleProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  createEmptyPnl,
  fetchLatestDraftPnl,
  saveEventPnl,
  updatePnlStatus,
  softDeletePnl,
  computeTotals,
  computeRevenueNet,
  computeCostTotal,
  type EventPnl,
  type RevenueLine,
  type CostLine,
  type PnlMeta,
} from "@/lib/pnl/data";
import { createEvent, updateEvent } from "@/lib/events/data";

const STATUS_LABELS: Record<EventPnl["status"], string> = {
  draft: "Taslak",
  in_review: "İncelemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  archived: "Arşivlendi",
};

const STATUS_BADGE_CLASS: Record<EventPnl["status"], string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  in_review: "bg-amber-500/20 text-amber-300",
  approved: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-red-500/20 text-red-300",
  archived: "bg-zinc-600/20 text-zinc-400",
};

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function genLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function PnlWorkspaceClient() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [pnl, setPnl] = useState<EventPnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenarioAttendance, setScenarioAttendance] = useState<number>(0);
  const [scenarioTicketPrice, setScenarioTicketPrice] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUseMock(false);
    try {
      const draft = await fetchLatestDraftPnl();
      if (draft) {
        setPnl(draft);
        setScenarioAttendance(draft.meta.expectedAttendance ?? 0);
        setScenarioTicketPrice(draft.meta.ticketPrice ?? 0);
      } else {
        const empty = createEmptyPnl();
        setPnl(empty);
        setScenarioAttendance(0);
        setScenarioTicketPrice(0);
      }
    } catch {
      const empty = createEmptyPnl();
      setPnl(empty);
      setUseMock(true);
      setScenarioAttendance(0);
      setScenarioTicketPrice(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateMeta = useCallback((updates: Partial<PnlMeta>) => {
    setPnl((prev) =>
      prev
        ? { ...prev, meta: { ...prev.meta, ...updates } }
        : null
    );
  }, []);

  const updateRevenueLine = useCallback((id: string, updates: Partial<RevenueLine>) => {
    setPnl((prev) => {
      if (!prev) return null;
      const lines = prev.revenue_lines.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      const withNet = lines.map((l) => ({
        ...l,
        net: computeRevenueNet({ ...l, ...(l.id === id ? updates : {}) }),
      }));
      const totals = computeTotals(
        withNet,
        prev.cost_lines,
        prev.meta.ticketPrice,
        prev.meta.expectedAttendance
      );
      return { ...prev, revenue_lines: withNet, totals };
    });
  }, []);

  const addRevenueLine = useCallback(() => {
    setPnl((prev) => {
      if (!prev) return null;
      const newLine: RevenueLine = {
        id: genLineId(),
        category: "Other",
        quantity: 0,
        unitPrice: 0,
        feePercent: 0,
        net: 0,
      };
      return { ...prev, revenue_lines: [...prev.revenue_lines, newLine] };
    });
  }, []);

  const removeRevenueLine = useCallback((id: string) => {
    setPnl((prev) => {
      if (!prev || prev.revenue_lines.length <= 1) return prev;
      const lines = prev.revenue_lines.filter((l) => l.id !== id);
      const totals = computeTotals(lines, prev.cost_lines);
      return { ...prev, revenue_lines: lines, totals };
    });
  }, []);

  const updateCostLine = useCallback((id: string, updates: Partial<CostLine>) => {
    setPnl((prev) => {
      if (!prev) return null;
      const lines = prev.cost_lines.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      const withTotal = lines.map((l) => ({
        ...l,
        total: computeCostTotal({ ...l, ...(l.id === id ? updates : {}) }),
      }));
      const totals = computeTotals(
        prev.revenue_lines,
        withTotal,
        prev.meta.ticketPrice,
        prev.meta.expectedAttendance
      );
      return { ...prev, cost_lines: withTotal, totals };
    });
  }, []);

  const addCostLine = useCallback(() => {
    setPnl((prev) => {
      if (!prev) return null;
      const newLine: CostLine = {
        id: genLineId(),
        category: "Other",
        quantity: 0,
        unitPrice: 0,
        total: 0,
      };
      return { ...prev, cost_lines: [...prev.cost_lines, newLine] };
    });
  }, []);

  const removeCostLine = useCallback((id: string) => {
    setPnl((prev) => {
      if (!prev || prev.cost_lines.length <= 1) return prev;
      const lines = prev.cost_lines.filter((l) => l.id !== id);
      const totals = computeTotals(prev.revenue_lines, lines);
      return { ...prev, cost_lines: lines, totals };
    });
  }, []);


  const handleSaveDraft = async () => {
    if (!pnl) return;
    setSaving(true);
    try {
      if (useMock) {
        setPnl((prev) => (prev ? { ...prev, updated_at: new Date().toISOString() } : null));
        toast.success("Taslak kaydedildi", "Yerel durum güncellendi.");
      } else {
        const saved = await saveEventPnl({ ...pnl, status: "draft" });
        setPnl(saved);
        toast.success("Taslak kaydedildi", "P&L veritabanına kaydedildi.");
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!pnl) return;
    setSaving(true);
    try {
      if (useMock) {
        setPnl((prev) => (prev ? { ...prev, status: "in_review" } : null));
        toast.success("İncelemeye gönderildi", "Durum güncellendi.");
      } else {
        const updated = await updatePnlStatus(pnl.id, "in_review");
        setPnl(updated);
        toast.success("İncelemeye gönderildi", "Durum güncellendi.");
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!pnl) return;
    const meta = pnl.meta;
    const eventName = meta.eventName || meta.pnlName || pnl.name;
    const startDate = meta.startDate || new Date().toISOString().slice(0, 10);
    const endDate = meta.endDate || startDate;
    const location = meta.location || null;
    const totalCosts = pnl.totals.totalCosts;

    setSaving(true);
    try {
      let eventId = pnl.event_id;

      if (eventId) {
        await updateEvent(eventId, {
          name: eventName,
          date: startDate,
          end_date: endDate,
          venue: location,
          status: "PLANLAMA",
          budget_planned: totalCosts,
        });
      } else {
        const created = await createEvent({
          name: eventName,
          date: startDate,
          end_date: endDate,
          venue: location,
          status: "PLANLAMA",
          budget_planned: totalCosts,
          created_by: user?.id ?? null,
        });
        eventId = created.id;
      }

      if (!useMock) {
        await saveEventPnl({
          ...pnl,
          status: "approved",
          event_id: eventId,
        });
      }

      setPnl((prev) =>
        prev ? { ...prev, status: "approved", event_id: eventId } : null
      );
      toast.success("Onaylandı", "Etkinlik oluşturuldu/güncellendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Etkinlik oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!pnl) return;
    setSaving(true);
    try {
      if (useMock) {
        setPnl((prev) => (prev ? { ...prev, status: "archived" } : null));
        toast.success("Arşivlendi", "Durum güncellendi.");
      } else {
        await softDeletePnl(pnl.id);
        setPnl((prev) => (prev ? { ...prev, status: "archived" } : null));
        toast.success("Arşivlendi", "P&L arşive taşındı.");
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Arşivlenemedi.");
    } finally {
      setSaving(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!pnl) return;
    setSaving(true);
    try {
      if (useMock) {
        setPnl(createEmptyPnl());
        toast.success("Silindi", "Yerel taslak sıfırlandı.");
      } else {
        await softDeletePnl(pnl.id);
        setPnl(createEmptyPnl());
        toast.success("Silindi", "P&L arşive taşındı.");
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const applyScenario = () => {
    if (!pnl) return;
    updateMeta({ expectedAttendance: scenarioAttendance, ticketPrice: scenarioTicketPrice });
    const ticketRow = pnl.revenue_lines.find((r) => r.category === "Ticket Sales");
    if (ticketRow) {
      updateRevenueLine(ticketRow.id, {
        quantity: scenarioAttendance,
        unitPrice: scenarioTicketPrice,
      });
    }
    toast.success("Senaryo uygulandı", "Değerler güncellendi.");
  };

  if (loading || !pnl) {
    return (
      <div className="flex w-full items-center justify-center py-24">
        <p className="ui-text-muted text-sm">{t("common_loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader title={t("m02_pnl_title")} subtitle={t("m02_pnl_subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[pnl.status]}`}
          >
            {STATUS_LABELS[pnl.status]}
          </span>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || pnl.status === "approved"}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {t("m02_pnl_save_draft")}
          </button>
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={saving || pnl.status !== "draft"}
            className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-50"
          >
            {t("m02_pnl_submit_review")}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={saving || (pnl.status !== "draft" && pnl.status !== "in_review")}
            className="ui-button-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {t("m02_pnl_approve")}
          </button>
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(true)}
            disabled={saving}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium ui-text-muted transition hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {t("m02_pnl_archive")}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {t("m02_pnl_delete")}
          </button>
        </div>
      </PageHeader>

      {useMock && (
        <p className="text-xs ui-text-muted">
          Supabase bağlantısı yok, veriler yerel durumda tutuluyor.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Section A: Event Meta */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            {t("m02_pnl_section_meta")}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">P&L Adı</label>
              <input
                value={pnl.name}
                onChange={(e) => setPnl((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Etkinlik Adı</label>
              <input
                value={pnl.meta.eventName ?? ""}
                onChange={(e) => updateMeta({ eventName: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Mekan</label>
              <input
                value={pnl.meta.location ?? ""}
                onChange={(e) => updateMeta({ location: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Başlangıç</label>
                <input
                  type="date"
                  value={pnl.meta.startDate ?? ""}
                  onChange={(e) => updateMeta({ startDate: e.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Bitiş</label>
                <input
                  type="date"
                  value={pnl.meta.endDate ?? ""}
                  onChange={(e) => updateMeta({ endDate: e.target.value })}
                  className="ui-input w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Beklenen Katılım</label>
              <input
                type="number"
                min="0"
                value={pnl.meta.expectedAttendance ?? ""}
                onChange={(e) => updateMeta({ expectedAttendance: parseInt(e.target.value, 10) || 0 })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium ui-text-muted">Bilet Fiyatı (₺)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pnl.meta.ticketPrice ?? ""}
                onChange={(e) => updateMeta({ ticketPrice: parseFloat(e.target.value) || 0 })}
                className="ui-input w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium ui-text-muted">Notlar</label>
              <textarea
                value={pnl.meta.notes ?? ""}
                onChange={(e) => updateMeta({ notes: e.target.value })}
                className="ui-input w-full min-h-[80px]"
              />
            </div>
          </div>
        </section>

        {/* Section D: Summary */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            {t("m02_pnl_section_summary")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm ui-text-muted">{t("m02_pnl_total_revenue")}</span>
              <span className="font-medium">₺{pnl.totals.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm ui-text-muted">{t("m02_pnl_total_costs")}</span>
              <span className="font-medium">₺{pnl.totals.totalCosts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-3">
              <span className="text-sm ui-text-muted">{t("m02_pnl_gross_profit")}</span>
              <span
                className={`font-medium ${
                  pnl.totals.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                ₺{pnl.totals.grossProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm ui-text-muted">{t("m02_pnl_margin")}</span>
              <span className="font-medium">%{pnl.totals.marginPercent.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm ui-text-muted">{t("m02_pnl_breakeven")}</span>
              <span className="font-medium">{pnl.totals.breakevenAttendance}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Section B: Revenue */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t("m02_pnl_section_revenue")}
          </h3>
          <button
            type="button"
            onClick={addRevenueLine}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--color-surface-hover)]"
          >
            + Satır Ekle
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-2 text-left text-xs font-medium ui-text-muted">Kategori</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Adet</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Birim Fiyat</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Komisyon %</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Net</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {pnl.revenue_lines.map((line) => (
                <tr key={line.id} className="border-b border-[var(--color-border)]/50">
                  <td className="px-3 py-2">
                    <input
                      value={line.category}
                      onChange={(e) => updateRevenueLine(line.id, { category: e.target.value })}
                      className="ui-input w-full min-w-[120px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={line.quantity}
                      onChange={(e) =>
                        updateRevenueLine(line.id, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-20 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateRevenueLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-24 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={line.feePercent}
                      onChange={(e) =>
                        updateRevenueLine(line.id, { feePercent: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-16 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    ₺{line.net.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRevenueLine(line.id)}
                      className="text-red-400 hover:text-red-300"
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section C: Costs */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t("m02_pnl_section_costs")}
          </h3>
          <button
            type="button"
            onClick={addCostLine}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--color-surface-hover)]"
          >
            + Satır Ekle
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-2 text-left text-xs font-medium ui-text-muted">Kategori</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Adet</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Birim Fiyat</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Komisyon %</th>
                <th className="px-3 py-2 text-right text-xs font-medium ui-text-muted">Toplam</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {pnl.cost_lines.map((line) => (
                <tr key={line.id} className="border-b border-[var(--color-border)]/50">
                  <td className="px-3 py-2">
                    <input
                      value={line.category}
                      onChange={(e) => updateCostLine(line.id, { category: e.target.value })}
                      className="ui-input w-full min-w-[120px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={line.quantity}
                      onChange={(e) =>
                        updateCostLine(line.id, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-20 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateCostLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-24 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={line.feePercent ?? 0}
                      onChange={(e) =>
                        updateCostLine(line.id, { feePercent: parseFloat(e.target.value) || 0 })
                      }
                      className="ui-input w-16 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    ₺{line.total.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeCostLine(line.id)}
                      className="text-red-400 hover:text-red-300"
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section E: What-if */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
          {t("m02_pnl_section_scenario")}
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Katılım</label>
            <input
              type="number"
              min="0"
              value={scenarioAttendance}
              onChange={(e) => setScenarioAttendance(parseInt(e.target.value, 10) || 0)}
              className="ui-input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium ui-text-muted">Bilet Fiyatı (₺)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={scenarioTicketPrice}
              onChange={(e) => setScenarioTicketPrice(parseFloat(e.target.value) || 0)}
              className="ui-input w-32"
            />
          </div>
          <button
            type="button"
            onClick={applyScenario}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t("m02_pnl_apply_scenario")}
          </button>
        </div>
      </section>

      {pnl.event_id && (
        <div className="flex justify-end">
          <Link
            href={`/m02/events/${pnl.event_id}`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Etkinliğe git →
          </Link>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        title="Arşivle"
      >
        <p className="mt-2 text-sm ui-text-muted">
          Bu P&L arşive taşınacak. Devam etmek istiyor musunuz?
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(false)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            {t("m02_cancel")}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={saving}
            className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Arşivle
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Sil"
      >
        <p className="mt-2 text-sm ui-text-muted">
          Bu P&L arşive taşınacak (soft delete). Devam etmek istiyor musunuz?
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
          >
            {t("m02_cancel")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 disabled:opacity-50"
          >
            Sil
          </button>
        </div>
      </Modal>
    </div>
  );
}
