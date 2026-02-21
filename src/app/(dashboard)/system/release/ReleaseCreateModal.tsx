"use client";

import { useState } from "react";

type ReleaseCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; summary: string; version_tag: string }) => Promise<void>;
};

export default function ReleaseCreateModal({
  isOpen,
  onClose,
  onSubmit,
}: ReleaseCreateModalProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [versionTag, setVersionTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), summary: summary.trim(), version_tag: versionTag.trim() });
      setTitle("");
      setSummary("");
      setVersionTag("");
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
      aria-labelledby="release-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="release-modal-title" className="text-lg font-semibold text-[var(--color-text)]">
          Yeni Release Oluştur
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Başlık
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: RB-011 System Settings"
              className="ui-input"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Özet
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Release özeti"
              className="ui-input min-h-[80px] resize-y"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Versiyon / Tag (isteğe bağlı)
            </label>
            <input
              type="text"
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              placeholder="GMW-2026-02-21-4"
              className="ui-input"
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
              {loading ? "Oluşturuluyor…" : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
