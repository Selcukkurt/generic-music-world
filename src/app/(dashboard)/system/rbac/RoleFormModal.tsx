"use client";

import { useEffect, useState } from "react";
import type { Role, RoleLevel } from "@/lib/rbac/roleManagement/types";
import { LEVEL_LABELS } from "@/lib/rbac/roleManagement/types";

const LEVELS: RoleLevel[] = [1, 2, 3, 4, 5];

type RoleFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; level: RoleLevel }) => void;
  initialRole?: Role | null;
  error?: string | null;
};

export default function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialRole,
  error,
}: RoleFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<RoleLevel>(3);

  useEffect(() => {
    if (isOpen) {
      setName(initialRole?.name ?? "");
      setDescription(initialRole?.description ?? "");
      setLevel(initialRole?.level ?? 3);
    }
  }, [isOpen, initialRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, description: description.trim(), level });
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
      aria-labelledby="role-form-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="role-form-title" className="text-lg font-semibold text-[var(--color-text)]">
          {initialRole ? "Rol Düzenle" : "Yeni Rol Oluştur"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Rol Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Editor"
              className="ui-input"
              required
              disabled={initialRole?.isLocked}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rol açıklaması"
              className="ui-input min-h-[80px] resize-y"
              rows={3}
              disabled={initialRole?.isLocked}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider ui-text-muted">
              Yetki Seviyesi
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as RoleLevel)}
              className="ui-input"
              disabled={initialRole?.isLocked}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}
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
              className="ui-button-primary flex-1 px-4 py-2.5 text-sm font-semibold"
            >
              {initialRole ? "Kaydet" : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
