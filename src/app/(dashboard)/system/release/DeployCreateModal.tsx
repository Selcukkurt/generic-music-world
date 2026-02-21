"use client";

import { useState } from "react";
import type { Release } from "./types";

type DeployCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  releases: Release[];
  onSubmit: (data: {
    release_id: string;
    environment: string;
    commit_sha: string;
    tag: string;
    status: string;
    notes: string;
  }) => Promise<void>;
};

export default function DeployCreateModal({
  isOpen,
  onClose,
  releases,
  onSubmit,
}: DeployCreateModalProps) {
  const [releaseId, setReleaseId] = useState("");
  const [environment, setEnvironment] = useState<"LOCAL" | "STAGING" | "PRODUCTION">("STAGING");
  const [commitSha, setCommitSha] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState<"SUCCESS" | "FAILED" | "IN_PROGRESS">("SUCCESS");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseId.trim()) {
      setError("Release seçin.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        release_id: releaseId,
        environment,
        commit_sha: commitSha.trim(),
        tag: tag.trim(),
        status,
        notes: notes.trim(),
      });
      setReleaseId("");
      setCommitSha("");
      setTag("");
      setNotes("");
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
      aria-labelledby="deploy-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="deploy-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
          Yeni Deploy Kaydı
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Release
            </label>
            <select
              value={releaseId}
              onChange={(e) => setReleaseId(e.target.value)}
              className="ui-input"
              required
            >
              <option value="">Seçin</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.release_id} – {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Ortam
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "LOCAL" | "STAGING" | "PRODUCTION")}
              className="ui-input"
            >
              <option value="LOCAL">Local</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Commit SHA
            </label>
            <input
              type="text"
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              placeholder="abc1234"
              className="ui-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Tag
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="v1.0.0"
              className="ui-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Durum
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "SUCCESS" | "FAILED" | "IN_PROGRESS")}
              className="ui-input"
            >
              <option value="SUCCESS">Başarılı</option>
              <option value="FAILED">Başarısız</option>
              <option value="IN_PROGRESS">Devam Ediyor</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deploy notları"
              className="ui-input min-h-[60px] resize-y"
              rows={2}
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
