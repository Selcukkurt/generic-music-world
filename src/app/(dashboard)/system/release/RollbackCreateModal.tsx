"use client";

import { useState } from "react";
import type { Deployment } from "./types";

type RollbackCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  deployments: Deployment[];
  onSubmit: (data: {
    from_deploy_id: string;
    to_deploy_id: string;
    reason: string;
  }) => Promise<void>;
};

export default function RollbackCreateModal({
  isOpen,
  onClose,
  deployments,
  onSubmit,
}: RollbackCreateModalProps) {
  const [fromDeployId, setFromDeployId] = useState("");
  const [toDeployId, setToDeployId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successDeploys = deployments.filter((d) => d.status === "SUCCESS");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDeployId.trim() || !toDeployId.trim()) {
      setError("Nereden ve nereye deploy seçin.");
      return;
    }
    if (fromDeployId === toDeployId) {
      setError("Nereden ve nereye farklı olmalı.");
      return;
    }
    if (!reason.trim()) {
      setError("Gerekçe zorunludur.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        from_deploy_id: fromDeployId,
        to_deploy_id: toDeployId,
        reason: reason.trim(),
      });
      setFromDeployId("");
      setToDeployId("");
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rollback-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rollback-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
          Rollback Kaydı Oluştur
        </h2>
        <p className="mt-1 text-xs ui-text-muted">
          Nereden (mevcut) ve nereye (hedef) deploy seçin.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Nereden (mevcut deploy)
            </label>
            <select
              value={fromDeployId}
              onChange={(e) => setFromDeployId(e.target.value)}
              className="ui-input"
              required
            >
              <option value="">Seçin</option>
              {successDeploys.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deploy_id} – {d.environment}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Nereye (hedef deploy)
            </label>
            <select
              value={toDeployId}
              onChange={(e) => setToDeployId(e.target.value)}
              className="ui-input"
              required
            >
              <option value="">Seçin</option>
              {successDeploys.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deploy_id} – {d.environment}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Gerekçe
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rollback gerekçesi"
              className="ui-input min-h-[80px] resize-y"
              rows={3}
              required
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ui-button-primary flex-1 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
