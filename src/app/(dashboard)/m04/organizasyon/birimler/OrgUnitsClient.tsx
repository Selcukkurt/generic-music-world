"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchOrgUnitsWithDetails,
  createOrgUnit,
  updateOrgUnit,
} from "@/lib/org-structure/data";
import type { OrgUnitWithDetails } from "@/lib/org-structure/types";

function getIndent(level: number): number {
  return Math.min(level, 4) * 16;
}

type ModalMode = "create" | "edit" | null;

export default function OrgUnitsClient() {
  const toast = useToast();
  const [units, setUnits] = useState<OrgUnitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUnit, setEditingUnit] = useState<OrgUnitWithDetails | null>(null);
  const [formName, setFormName] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [formModuleCode, setFormModuleCode] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrgUnitsWithDetails();
      setUnits(data);
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Organizasyon birimleri yüklenemedi.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingUnit(null);
    setFormName("");
    setFormParentId("");
    setFormModuleCode("");
    setFormActive(true);
    setModalMode("create");
  };

  const openEdit = (unit: OrgUnitWithDetails) => {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormParentId(unit.parent_id ?? "");
    setFormModuleCode(unit.module_code ?? "");
    setFormActive(unit.active);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUnit(null);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) {
      toast.error("Hata", "Birim adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "create") {
        await createOrgUnit({
          name,
          parent_id: formParentId || null,
          module_code: formModuleCode.trim() || null,
          level: 0,
          active: formActive,
        });
        toast.success("Başarılı", "Birim oluşturuldu.");
      } else if (modalMode === "edit" && editingUnit) {
        await updateOrgUnit(editingUnit.id, {
          name,
          parent_id: formParentId || null,
          module_code: formModuleCode.trim() || null,
          active: formActive,
        });
        toast.success("Başarılı", "Birim güncellendi.");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    statusFilter === "all"
      ? units
      : statusFilter === "active"
        ? units.filter((u) => u.active)
        : units.filter((u) => !u.active);

  const parentOptions = units.filter((u) => !editingUnit || u.id !== editingUnit.id);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Organizasyon Birimleri"
        subtitle="Organizasyon birimleri ve hiyerarşi. Hiyerarşi şemasına veri sağlar."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="ui-input w-32 py-2 text-sm"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="all">Tümü</option>
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Yeni Birim Ekle
          </button>
          <Link
            href="/m04/organizasyon/hiyerarsi"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Hiyerarşi Şeması
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
            <p className="text-sm font-medium text-[var(--color-text)]">Organizasyon birimi bulunamadı.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Yeni Birim Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Birim Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Üst Birim</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Yönetici</th>
                  <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr
                    key={unit.id}
                    className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]/30"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-medium text-[var(--color-text)]"
                        style={{ paddingLeft: getIndent(unit.level) }}
                      >
                        {unit.name}
                      </span>
                      {unit.module_code && (
                        <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-surface2)] ui-text-muted">
                          {unit.module_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      {unit.parent?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm ui-text-secondary">
                      {unit.manager?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          unit.active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {unit.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(unit)}
                        className="rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                      >
                        Düzenle
                      </button>
                      <Link
                        href={`/m04/organizasyon/hiyerarsi?unit=${unit.id}`}
                        className="ml-2 rounded px-2 py-1 text-xs font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                      >
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
          onKeyDown={(e) => e.key === "Escape" && closeModal()}
          role="button"
          tabIndex={0}
          aria-modal="true"
        >
          <div
            className="ui-glass w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
              {modalMode === "create" ? "Yeni Birim Ekle" : "Birim Düzenle"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Birim Adı *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="ui-input w-full"
                  placeholder="Örn: Operasyonlar"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Üst Birim</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="ui-input w-full"
                >
                  <option value="">— Yok —</option>
                  {parentOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium ui-text-secondary">Modül Kodu</label>
                <input
                  type="text"
                  value={formModuleCode}
                  onChange={(e) => setFormModuleCode(e.target.value)}
                  className="ui-input w-full"
                  placeholder="Örn: M04"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="form-active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="form-active" className="text-sm ui-text-secondary">
                  Aktif
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
